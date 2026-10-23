"""Q6b: is the `now - 1 day` cursor a ROLLING window or a one-time floor?

memory_lifecycle.py:21-28: `since` is computed ONLY in the KeyError branch, so it
seeds the cursor exactly once per (scope,user) and never rolls. This script
separates the two claims and measures which one actually loses overnight context.
"""
from __future__ import annotations

import asyncio
import hashlib
from datetime import datetime, timedelta, timezone

from _fixture import Provider, Settings, backdate, check, fresh_store, seed_round, service, show

UTC = timezone.utc
NOW = datetime.now(UTC)


def key(scope="web:default", user="owner"):
    return "memory-progress-" + hashlib.sha256((scope + "\x00" + user).encode()).hexdigest()[:32]


async def main():
    show("Q6b-1: first-ever cursor is a one-time floor at now-1day, not a rolling window")
    store = fresh_store("q6b1")
    settings = Settings()
    provider = Provider(settings)
    chat = service(store, settings, provider)
    store.upsert_scope({"id": "web:default", "context_compress": False, "auto_memory": True, "allow_tools": False})

    first = chat.memory_lifecycle._state("web:default", "owner")
    print("first cursor_at:", first[0])
    # A message from 3 days ago (older than the floor) can never be extracted.
    ancient = store.add_message("web:default", "owner", "user", "三天前的重要约定：周日十点集合")
    backdate(store, ancient["id"], NOW - timedelta(days=3))
    # A message from 2 days ago: also older than the floor.
    two_days = store.add_message("web:default", "owner", "user", "两天前：改到十一点")
    backdate(store, two_days["id"], NOW - timedelta(days=2))
    # A message from 30 hours ago: still older than the 24h floor.
    overnight = store.add_message("web:default", "owner", "user", "昨晚：那就十一点半吧")
    backdate(store, overnight["id"], NOW - timedelta(hours=30))

    pending_ids = {r["id"] for r in chat.memory_lifecycle.pending("web:default", "owner")}
    print("pending:", len(pending_ids))
    check("a message from 30h ago is NOT pending (the 'overnight' message is lost)",
          overnight["id"] not in pending_ids)
    check("3-day-old and 2-day-old messages are NOT pending",
          ancient["id"] not in pending_ids and two_days["id"] not in pending_ids)

    show("Q6b-2: the cursor does not roll forward with time; only advance() moves it")
    before = chat.memory_lifecycle._state("web:default", "owner")[0]
    # Simulate the next morning: a new message arrives, extraction succeeds.
    fresh = store.add_message("web:default", "owner", "user", "第二天早上的新消息")
    pend = chat.memory_lifecycle.pending("web:default", "owner")
    chat.memory_lifecycle.advance("web:default", "owner", pend)
    after = chat.memory_lifecycle._state("web:default", "owner")[0]
    print("cursor before:", before, "-> after advance:", after)
    check("advance() moves the cursor to the newest processed message", after > before)

    show("Q6b-3: after the first use, an overnight message IS still pending (so the floor is one-time)")
    store2 = fresh_store("q6b3")
    p2 = Provider(settings)
    chat2 = service(store2, settings, p2)
    store2.upsert_scope({"id": "web:default", "context_compress": False, "auto_memory": True, "allow_tools": False})
    chat2.memory_lifecycle._state("web:default", "owner")  # seed the cursor
    # last night's session
    last_night = store2.add_message("web:default", "owner", "user", "昨晚最后一句：明天见")
    backdate(store2, last_night["id"], NOW - timedelta(hours=14))
    chat2.memory_lifecycle.advance("web:default", "owner", [last_night])
    # this morning
    this_morning = store2.add_message("web:default", "owner", "user", "今天早上：那后来呢")
    pend2 = {r["id"] for r in chat2.memory_lifecycle.pending("web:default", "owner")}
    print("morning message pending:", this_morning["id"] in pend2)
    check("an overnight-then-morning message IS pending once the cursor has been seeded",
          this_morning["id"] in pend2,
          "the 24h floor only bites at first-ever use of a (scope,user) pair")

    show("Q6b-4: what is lost is history that predates the FIRST extraction attempt")
    store3 = fresh_store("q6b4")
    p3 = Provider(settings)
    chat3 = service(store3, settings, p3)
    store3.upsert_scope({"id": "web:default", "context_compress": False, "auto_memory": True, "allow_tools": False})
    # A long pre-existing history: the bot was installed/used for days before
    # automatic memory was enabled (or the settings file was reset).
    old = [store3.add_message("web:default", "owner", "user", f"历史约定{i}") for i in range(6)]
    for i, rec in enumerate(old):
        backdate(store3, rec["id"], NOW - timedelta(days=5, hours=i))
    state = chat3.memory_lifecycle._state("web:default", "owner")   # first call seeds now-1day
    print("cursor:", state[0])
    out = await chat3._extract("web:default", "owner", automatic=False)
    print("extract:", out)
    pend3 = chat3.memory_lifecycle.pending("web:default", "owner")
    print("pending after seeding:", len(pend3))
    check("the entire pre-existing history is skipped by the first extraction",
          len(pend3) == 0, "6 user messages from 5 days ago are unreachable")

    await chat.close(); await chat2.close(); await chat3.close()
    store.close(); store2.close(); store3.close()


if __name__ == "__main__":
    asyncio.run(main())
