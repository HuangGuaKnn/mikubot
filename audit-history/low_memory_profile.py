"""Digest eviction under the DOCUMENTED low-memory profile.

docs/LOW_MEMORY.md:41 recommends 历史消息上限 16 条 / 输入文字上限 16000 字.
settings.py:570,575 allow max_history_messages in [1,400] and max_input_chars in [2000,200000].
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from _fixture import Provider, Settings, check, fresh_store, seed_round, service, show

UTC = timezone.utc
YESTERDAY = datetime(2026, 10, 23, 13, 0, tzinfo=UTC)


async def main():
    show("low-memory profile: max_history_messages=16, max_input_chars=16000")
    store = fresh_store("lm")
    settings = Settings(enabled=True, trigger_messages=20, max_chars=18000, keep_recent=4,
                        max_history_messages=16, max_input_chars=16000)
    digest = "DIGEST_OVERNIGHT：" + ("昨晚的关键约定：周日十点集合，人数未定，菜单待确认。" * 40)
    provider = Provider(settings, digest=digest)
    chat = service(store, settings, provider)
    store.upsert_scope({"id": "web:default", "context_compress": True, "auto_memory": False, "allow_tools": False})
    for i in range(6):
        store.create_memory({"content": f"长期记忆{i}：" + ("用户资料内容。" * 60), "pinned": True})
    seed_round(store, "web:default", "owner", 40, content=lambda i: f"第{i}条：" + ("旧对话内容。" * 100),
               t0=YESTERDAY, step_seconds=60)

    result = await chat.respond("web:default", "owner", "那后来呢")
    call = provider.chat_calls[-1]
    sent = "\n".join(str(m["content"]) for m in call["messages"])
    digest_ids = [r["id"] for r in store.list_memories() if r.get("property") == "conversation_digest"]
    saved = store.get_message(result["message_id"])
    total = sum(len(str(m["content"])) for m in call["messages"])
    print("digest length:", len(digest), "(limit 2400)")
    print("prompt roles:", [m["role"] for m in call["messages"]])
    print("prompt chars:", total, "| budget:", settings.get()["context"]["max_input_chars"])
    print("history from _history():", len(chat._history("web:default", limit=400, user_id="owner")))
    print("digest in prompt:", "DIGEST_OVERNIGHT" in sent)
    print("context_compressed:", result["context_compressed"])
    print("digest recorded as used:", [d[:8] for d in saved["metadata"].get("memory_versions", {}) if d in digest_ids])
    check("NO digest was created: max_history_messages=16 < trigger_messages=20 (D4)",
          len(digest_ids) == 0, "the engine only ever receives 16 messages, below the threshold")
    check("the context_digest model is never called", not [c for c in provider.calls if c["purpose"] == "context_digest"])
    check("the reply reports context_compressed=False", result["context_compressed"] is False)
    check("_history is capped at max_history_messages=16", len(chat._history("web:default", limit=400, user_id="owner")) == 16)

    await chat.close()
    store.close()


if __name__ == "__main__":
    asyncio.run(main())
