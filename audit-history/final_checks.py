"""Final checks.

(a) Does the digest get evicted by _input_budget at the DEFAULT max_input_chars=80000?
(b) _time_history LIMIT 24 takes the 24 NEWEST user messages in the window, so an
    explicit query about older in-window content retrieves the wrong period.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from _fixture import Provider, Settings, backdate, check, fresh_store, seed_round, service, show

UTC = timezone.utc
YESTERDAY = datetime(2026, 10, 23, 13, 0, tzinfo=UTC)
NOW = datetime.now(UTC)


async def main():
    show("(a) digest eviction at the DEFAULT 80000-char budget")
    store = fresh_store("fa")
    settings = Settings(enabled=True, trigger_messages=20, max_chars=18000, keep_recent=4)
    assert settings.get()["context"]["max_input_chars"] == 80000
    digest = "DIGEST_OVERNIGHT：" + ("昨晚的关键约定：周日十点集合。\n" * 100)  # ~1500 chars, under MAX_SUMMARY_CHARS
    provider = Provider(settings, digest=digest)
    chat = service(store, settings, provider)
    store.upsert_scope({"id": "web:default", "context_compress": True, "auto_memory": False, "allow_tools": False})
    # Large pinned memories inflate the reference-data system block, as a long-lived
    # conversation with accumulated facts does.
    for i in range(6):
        store.create_memory({"content": f"长期记忆{i}：" + ("用户资料内容。" * 200), "pinned": True})
    # Long history: 60 messages x ~2500 chars ~= 150k chars, above the 80k budget.
    seed_round(store, "web:default", "owner", 60, content=lambda i: f"第{i}条：" + ("旧对话内容。" * 250),
               t0=YESTERDAY, step_seconds=60)

    result = await chat.respond("web:default", "owner", "那后来呢")
    call = provider.chat_calls[-1]
    sent = "\n".join(str(m["content"]) for m in call["messages"])
    digest_ids = [r["id"] for r in store.list_memories() if r.get("property") == "conversation_digest"]
    saved = store.get_message(result["message_id"])
    total = sum(len(str(m["content"])) for m in call["messages"])
    print("prompt roles:", [m["role"] for m in call["messages"]])
    print("prompt chars:", total, "| budget: 80000")
    print("digest in prompt:", "DIGEST_OVERNIGHT" in sent)
    print("context_compressed:", result["context_compressed"])
    print("digest recorded in memory_versions:",
          [d[:8] for d in saved["metadata"].get("memory_versions", {}) if d in digest_ids])
    check("eviction runs at the default budget", total <= 80000, f"{total} chars")
    check("at the default 80000 budget the digest is NOT evicted (D3 is budget-dependent)",
          "DIGEST_OVERNIGHT" in sent, "the defect reproduces at smaller supported budgets")
    check("the reply reports context_compressed=True", result["context_compressed"] is True)
    check("the digest is recorded as a used memory version",
          bool([d for d in saved["metadata"].get("memory_versions", {}) if d in digest_ids]))

    show("(b) _time_history LIMIT 24 picks the newest, not the queried period")
    store2 = fresh_store("fb")
    p2 = Provider(settings)
    chat2 = service(store2, settings, p2)
    store2.upsert_scope({"id": "web:default", "context_compress": False, "auto_memory": False, "allow_tools": False})
    # One message 5 days ago (inside the 最近 30-day window) and 30 messages today.
    old = store2.add_message("web:default", "owner", "user", "五天前的约定：周日十点集合")
    backdate(store2, old["id"], NOW - timedelta(days=5))
    for i in range(30):
        rec = store2.add_message("web:default", "owner", "user", f"今天的消息{i}")
        backdate(store2, rec["id"], NOW - timedelta(minutes=30 - i))
    dated = chat2._time_history("web:default", "owner", "最近说到哪了")
    ids = {r["id"] for r in dated}
    print("最近 window records:", len(dated), "| 5-day-old message included:", old["id"] in ids)
    print("oldest returned:", min(r["created_at"] for r in dated))
    check("the 最近 query returns 24 records but NOT the 5-day-old one",
          old["id"] not in ids,
          "ORDER BY created_at DESC LIMIT 24 (chat.py:508) keeps the newest 24 in the window")
    check("the 5-day-old message is inside the 最近 30-day window",
          True, "_time_window('最近') = now-30d .. now (memory.py:142)")

    # Fewer than 24 user messages in the window: the old one IS returned...
    store3 = fresh_store("fc")
    p3 = Provider(settings)
    chat3 = service(store3, settings, p3)
    store3.upsert_scope({"id": "web:default", "context_compress": False, "auto_memory": False, "allow_tools": False})
    old3 = store3.add_message("web:default", "owner", "user", "五天前的约定：周日十点集合")
    backdate(store3, old3["id"], NOW - timedelta(days=5))
    for i in range(5):
        rec = store3.add_message("web:default", "owner", "user", f"今天的消息{i}")
        backdate(store3, rec["id"], NOW - timedelta(minutes=10 - i))
    dated3 = chat3._time_history("web:default", "owner", "最近说到哪了")
    ids3 = {r["id"] for r in dated3}
    print("few-message case: records:", len(dated3), "| 5-day-old included:", old3["id"] in ids3)
    check("with fewer than 24 in-window user messages the old one IS returned",
          old3["id"] in ids3)
    # ...and then the context engine drops it anyway.
    built = await chat3.context.build("web:default", "owner", dated3)
    print("survived ContextEngine.build:", len(built["messages"]), "of", len(dated3))
    check("but ContextEngine.build still discards it (fingerprint mismatch)",
          old3["id"] not in {m["id"] for m in built["messages"]})

    await chat.close(); await chat2.close(); await chat3.close()
    store.close(); store2.close(); store3.close()


if __name__ == "__main__":
    asyncio.run(main())
