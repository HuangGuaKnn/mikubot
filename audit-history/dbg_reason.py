"""Debug: why is no digest produced at the default budget in the long-history case?"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from _fixture import Provider, Settings, check, fresh_store, seed_round, service, show

UTC = timezone.utc
YESTERDAY = datetime(2026, 10, 23, 13, 0, tzinfo=UTC)


async def main():
    store = fresh_store("dbg")
    settings = Settings(enabled=True, trigger_messages=20, max_chars=18000, keep_recent=4)
    provider = Provider(settings, digest="DIGEST_OVERNIGHT：" + ("昨晚的关键约定：周日十点集合。\n" * 200))
    chat = service(store, settings, provider)
    store.upsert_scope({"id": "web:default", "context_compress": True, "auto_memory": False, "allow_tools": False})
    for i in range(6):
        store.create_memory({"content": f"长期记忆{i}：" + ("用户资料内容。" * 200), "pinned": True})
    seed_round(store, "web:default", "owner", 60, content=lambda i: f"第{i}条：" + ("旧对话内容。" * 250),
               t0=YESTERDAY, step_seconds=60)

    history = chat._history("web:default", limit=400, user_id="owner")
    print("history from _history(limit=400):", len(history))
    result = await chat.context.build("web:default", "owner", history)
    print("reason:", result["reason"], "compressed:", result["compressed"],
          "messages:", len(result["messages"]))
    print("digest calls:", len([c for c in provider.calls if c["purpose"] == "context_digest"]))
    digests = [r for r in store.list_memories() if r.get("property") == "conversation_digest"]
    print("digest records:", len(digests))
    events = [e for e in store.list_events(limit=20) if e.get("kind") == "context_digest"]
    for e in events:
        print("event:", e.get("message"), e.get("details", {}).get("error"))

    # Now the same but with a request text short enough that _history is small:
    print("\n-- with a shorter stored history (30 msgs) --")
    store2 = fresh_store("dbg2")
    p2 = Provider(settings, digest="DIGEST_OVERNIGHT：" + ("昨晚的关键约定：周日十点集合。\n" * 200))
    chat2 = service(store2, settings, p2)
    store2.upsert_scope({"id": "web:default", "context_compress": True, "auto_memory": False, "allow_tools": False})
    seed_round(store2, "web:default", "owner", 30, content=lambda i: f"第{i}条：" + ("旧对话内容。" * 250),
               t0=YESTERDAY, step_seconds=60)
    hist2 = chat2._history("web:default", limit=400, user_id="owner")
    res2 = await chat2.context.build("web:default", "owner", hist2)
    print("reason:", res2["reason"], "compressed:", res2["compressed"], "messages:", len(res2["messages"]))
    print("digest len:", len(res2["summary"]["content"]) if res2["summary"] else 0)

    await chat.close(); await chat2.close()
    store.close(); store2.close()


if __name__ == "__main__":
    asyncio.run(main())
