"""Severity band for the digest-eviction defect at a supported budget (16000)."""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from _fixture import Provider, Settings, check, fresh_store, seed_round, service, show

UTC = timezone.utc
YESTERDAY = datetime(2026, 10, 23, 13, 0, tzinfo=UTC)


async def main():
    show("digest eviction at max_input_chars=16000 (a supported low-memory value)")
    store = fresh_store("band")
    settings = Settings(enabled=True, trigger_messages=20, max_chars=18000, keep_recent=4,
                        max_history_messages=400, max_input_chars=16000)
    digest = "DIGEST_OVERNIGHT：" + ("昨晚的关键约定：周日十点集合，人数未定，菜单待确认。" * 40)
    provider = Provider(settings, digest=digest)
    chat = service(store, settings, provider)
    store.upsert_scope({"id": "web:default", "context_compress": True, "auto_memory": False, "allow_tools": False})
    # Big persona system prompt + big pinned memories: both inflate the fixed blocks.
    store.save_persona({"id": "p1", "name": "测试人格", "system_prompt": "角色设定。" * 800,
                        "description": "长人设"})
    store.upsert_scope({"id": "web:default", "context_compress": True, "auto_memory": False,
                        "allow_tools": False, "persona_id": "p1"})
    for i in range(4):
        store.create_memory({"content": f"长期记忆{i}：" + ("用户资料内容。" * 200), "pinned": True})
    seed_round(store, "web:default", "owner", 40, content=lambda i: f"第{i}条：" + ("旧对话内容。" * 100),
               t0=YESTERDAY, step_seconds=60)

    result = await chat.respond("web:default", "owner", "那后来呢")
    call = provider.chat_calls[-1]
    sent = "\n".join(str(m["content"]) for m in call["messages"])
    digest_ids = [r["id"] for r in store.list_memories() if r.get("property") == "conversation_digest"]
    saved = store.get_message(result["message_id"])
    total = sum(len(str(m["content"])) for m in call["messages"])
    print("digest length:", len(digest))
    print("prompt roles:", [m["role"] for m in call["messages"]])
    print("prompt chars:", total, "| budget:", settings.get()["context"]["max_input_chars"])
    print("system1 chars:", len(str(call["messages"][0]["content"])))
    print("digest in prompt:", "DIGEST_OVERNIGHT" in sent)
    print("context_compressed:", result["context_compressed"])
    print("digest recorded as used:",
          [d[:8] for d in saved["metadata"].get("memory_versions", {}) if d in digest_ids])
    check("a digest was created", len(digest_ids) == 1)
    check("at this budget/persona combination the digest IS still sent (D3 is budget-dependent)",
          "DIGEST_OVERNIGHT" in sent,
          f"prompt {total} chars vs budget 16000; the eviction reproduced at 2000-2500")
    check("context_compressed is reported True", result["context_compressed"] is True)
    check("the digest is recorded in the saved message metadata",
          bool([d for d in saved["metadata"].get("memory_versions", {}) if d in digest_ids]))

    await chat.close()
    store.close()


if __name__ == "__main__":
    asyncio.run(main())
