"""DEFECT: `context.max_history_messages` caps the input to the context engine,
so automatic compression can never fire when max_history_messages < trigger_messages.

chat.py:245 asks for limit=400 when compression is on, but _history (chat.py:487)
does `min(limit, max_history_messages)`. context.py:232 then compares that capped
count against trigger_messages. The documented low-memory profile
(docs/LOW_MEMORY.md:41) sets 16 history messages while the default trigger is 60.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from _fixture import Provider, Settings, check, fresh_store, seed_round, service, show

UTC = timezone.utc
YESTERDAY = datetime(2026, 10, 23, 13, 0, tzinfo=UTC)


async def main():
    show("default trigger (60) + documented low-memory history cap (16)")
    store = fresh_store("cap")
    settings = Settings(enabled=True, max_history_messages=16)  # trigger_messages stays 60
    cfg = settings.get()["context"]
    print("context config:", {k: cfg[k] for k in ("enabled", "trigger_messages", "keep_recent",
                                                  "max_chars", "max_history_messages")})
    provider = Provider(settings, digest="DIGEST：昨晚约好周日做饭。")
    chat = service(store, settings, provider)
    store.upsert_scope({"id": "web:default", "context_compress": True, "auto_memory": False, "allow_tools": False})

    # 200 messages, far above trigger_messages=60.
    seed_round(store, "web:default", "owner", 200, content=lambda i: f"第{i}条：讨论周日做饭。",
               t0=YESTERDAY, step_seconds=30)
    print("stored messages:", len(store.list_messages("web:default", limit=400)))

    history = chat._history("web:default", limit=400, user_id="owner")
    print("_history(limit=400) returned:", len(history), "<- capped by max_history_messages")
    result = await chat.context.build("web:default", "owner", history)
    print("build reason:", result["reason"], "| compressed:", result["compressed"])
    digest_calls = [c for c in provider.calls if c["purpose"] == "context_digest"]
    print("context_digest model calls:", len(digest_calls))
    check("200 messages are stored", len(store.list_messages("web:default", limit=400)) == 200)
    check("the context engine only ever receives max_history_messages", len(history) == 16)
    check("automatic compression NEVER fires (below_threshold forever)",
          result["reason"] == "below_threshold" and not result["compressed"],
          f"reason={result['reason']}")
    check("the digest model is never called", not digest_calls)

    show("control: raising max_history_messages above the trigger makes compression fire")
    store2 = fresh_store("cap2")
    settings2 = Settings(enabled=True, max_history_messages=400)
    p2 = Provider(settings2, digest="DIGEST：昨晚约好周日做饭。")
    chat2 = service(store2, settings2, p2)
    store2.upsert_scope({"id": "web:default", "context_compress": True, "auto_memory": False, "allow_tools": False})
    seed_round(store2, "web:default", "owner", 200, content=lambda i: f"第{i}条：讨论周日做饭。",
               t0=YESTERDAY, step_seconds=30)
    h2 = chat2._history("web:default", limit=400, user_id="owner")
    r2 = await chat2.context.build("web:default", "owner", h2)
    print("history:", len(h2), "| reason:", r2["reason"], "| compressed:", r2["compressed"])
    check("with max_history_messages=400 compression fires", r2["compressed"])

    await chat.close(); await chat2.close()
    store.close(); store2.close()


if __name__ == "__main__":
    asyncio.run(main())
