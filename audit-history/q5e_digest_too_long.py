"""Q5e: the digest is silently DISCARDED when the model's output exceeds
MAX_SUMMARY_CHARS (2400), even though the prompt asks for 最多900字.

context.py:293-296: `if not text or len(text) > MAX_SUMMARY_CHARS or not unchanged:`
-> reason becomes summary_exceeds_output_limit and NO summary is saved. Raw history
is returned, so the overnight window is never compressed and the next morning
starts from raw 24-message slicing again.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from _fixture import Provider, Settings, check, fresh_store, seed_round, service, show

UTC = timezone.utc
YESTERDAY = datetime(2026, 10, 23, 13, 0, tzinfo=UTC)


async def main():
    show("Q5e: over-long digest output -> summary_exceeds_output_limit -> no digest at all")
    store = fresh_store("q5e")
    settings = Settings(enabled=True, trigger_messages=20, max_chars=18000, keep_recent=4)
    # A realistic over-long model answer: 3000 chars (> 2400, the prompt asked for <=900).
    provider = Provider(settings, digest="摘要：" + ("昨晚约好周日做饭，人数未定。" * 250))
    chat = service(store, settings, provider)
    store.upsert_scope({"id": "web:default", "context_compress": True, "auto_memory": False, "allow_tools": False})
    seed_round(store, "web:default", "owner", 60, content=lambda i: f"第{i}条：讨论周日做饭。", t0=YESTERDAY, step_seconds=60)

    history = chat._history("web:default", limit=400, user_id="owner")
    result = await chat.context.build("web:default", "owner", history)
    print("digest output length:", len(provider.digest))
    print("build reason:", result["reason"], "| compressed:", result["compressed"],
          "| raw messages returned:", len(result["messages"]))
    print("digest records created:", len([r for r in store.list_memories() if r.get("property") == "conversation_digest"]))
    check("an over-long digest produces NO summary record",
          not [r for r in store.list_memories() if r.get("property") == "conversation_digest"])
    check("the reason is summary_exceeds_output_limit", result["reason"] == "summary_exceeds_output_limit")
    check("all 60 raw messages are returned uncompressed", len(result["messages"]) == 60)
    check("no event is recorded for this failure (only model_failed records one)",
          not [e for e in store.list_events(limit=20) if e.get("kind") == "context_digest"],
          "context.py:288 records model_failed; the length path is silent")

    show("Q5e-2: the same digest passes when it is under 2400 chars")
    store2 = fresh_store("q5e2")
    p2 = Provider(settings, digest="摘要：" + ("昨晚约好周日做饭，人数未定。" * 80))
    chat2 = service(store2, settings, p2)
    store2.upsert_scope({"id": "web:default", "context_compress": True, "auto_memory": False, "allow_tools": False})
    seed_round(store2, "web:default", "owner", 60, content=lambda i: f"第{i}条：讨论周日做饭。", t0=YESTERDAY, step_seconds=60)
    h2 = chat2._history("web:default", limit=400, user_id="owner")
    r2 = await chat2.context.build("web:default", "owner", h2)
    print("digest length:", len(p2.digest), "| reason:", r2["reason"], "| compressed:", r2["compressed"])
    check("a <=2400-char digest is accepted", r2["compressed"] and r2["reason"] == "compressed")

    await chat.close(); await chat2.close()
    store.close(); store2.close()


if __name__ == "__main__":
    asyncio.run(main())
