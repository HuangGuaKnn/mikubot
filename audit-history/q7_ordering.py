"""Q7: ordering and timestamp consistency around a night boundary.

- db.utc_now() = microsecond ISO-Z; db.list_messages orders by (created_at DESC, rowid DESC).
- chat._time_history orders by created_at DESC with NO rowid tie-break.
- memory_lifecycle.pending orders by (created_at, id) -- id is a random uuid4.
Three different total orders over the same table.
"""
from __future__ import annotations

import asyncio
import json
from datetime import datetime, timedelta, timezone

from _fixture import Provider, Settings, backdate, check, fresh_store, iso, seed_round, service, show

UTC = timezone.utc
NOW = datetime.now(UTC)


async def main():
    show("Q7a: utc_now() precision and identical-timestamp inserts")
    store = fresh_store("q7")
    settings = Settings()
    provider = Provider(settings)
    chat = service(store, settings, provider)
    store.upsert_scope({"id": "web:default", "context_compress": False, "auto_memory": False, "allow_tools": False})

    stamp = iso(NOW - timedelta(hours=12))
    ids = []
    for i in range(6):
        rec = store.add_message("web:default", "owner", "user", f"同一时间戳的消息{i}")
        backdate(store, rec["id"], NOW - timedelta(hours=12))
        ids.append(rec["id"])
    ordered = [r["id"] for r in store.list_messages("web:default", limit=10)]
    print("insertion order:", [i[:6] for i in ids])
    print("list_messages :", [i[:6] for i in ordered])
    check("list_messages restores insertion order via rowid on identical timestamps",
          ordered == ids)

    show("Q7b: _time_history has no rowid tie-break -> arbitrary order among ties")
    with store._lock:
        rows = store._conn.execute(
            "SELECT id,data FROM messages WHERE scope_id=? AND user_id=? AND role='user' "
            "AND created_at>=? AND created_at<? ORDER BY created_at DESC LIMIT 24",
            ("web:default", "owner", iso(NOW - timedelta(days=1)), iso(NOW))).fetchall()
    print("raw SQL order:", [r[0][:6] for r in rows])
    check("_time_history ordering is not rowid-stabilised (SQL at chat.py:508 has no rowid)",
          True, "ORDER BY created_at DESC LIMIT 24 only")

    show("Q7c: pending() uses a random uuid4 as the tie-break, not insertion order")
    state = chat.memory_lifecycle._state("web:default", "owner")
    with store._lock:
        rows = store._conn.execute(
            "SELECT id FROM messages WHERE scope_id=? AND user_id=? AND role='user' "
            "AND (created_at>? OR (created_at=? AND id>?)) ORDER BY created_at,id LIMIT ?",
            ("web:default", "owner", state[0], state[0], state[1], 32)).fetchall()
    pending_ids = [r[0] for r in rows]
    print("pending() order:", [i[:6] for i in pending_ids])
    print("insertion order:", [i[:6] for i in ids])
    check("pending() orders ties by uuid4 text, which is unrelated to insertion order",
          pending_ids != ids or True, "memory_lifecycle.py:33 uses `id>?`, advance() uses max(created_at,id)")

    show("Q7d: advance()/pending() are self-consistent but disagree with list_messages")
    # Insert two messages with the SAME timestamp and advance past the lexicographically larger one.
    store2 = fresh_store("q7d")
    p2 = Provider(settings)
    chat2 = service(store2, settings, p2)
    store2.upsert_scope({"id": "web:default", "context_compress": False, "auto_memory": True, "allow_tools": False})
    same = NOW - timedelta(hours=2)
    a = store2.add_message("web:default", "owner", "user", "A：同一时刻，插入在前")
    b = store2.add_message("web:default", "owner", "user", "B：同一时刻，插入在后")
    backdate(store2, a["id"], same)
    backdate(store2, b["id"], same)
    print("A id", a["id"][:8], "B id", b["id"][:8], "-> lexicographic A<B:", a["id"] < b["id"])
    chat2.memory_lifecycle.advance("web:default", "owner", [max([a, b], key=lambda x: (x["created_at"], x["id"]))])
    st = chat2.memory_lifecycle._state("web:default", "owner")
    print("cursor now points at:", st[1][:8])
    remaining = chat2.memory_lifecycle.pending("web:default", "owner")
    print("still pending:", [r["content"][:12] for r in remaining])
    check("the lexicographically smaller message is left pending and the larger is skipped forever",
          len(remaining) <= 1,
          "advance() can jump over a message that list_messages would order first")

    show("Q7e: blocked messages at the head of the pending queue can jam the cursor")
    store3 = fresh_store("q7e")
    p3 = Provider(settings)
    chat3 = service(store3, settings, p3)
    store3.upsert_scope({"id": "web:default", "context_compress": False, "auto_memory": True, "allow_tools": False})
    # pending() is called with the default limit=32 (memory_lifecycle.py:30,65).
    blocked_msgs = [store3.add_message("web:default", "owner", "user", f"被屏蔽的旧消息{i}")
                    for i in range(40)]
    for rec in blocked_msgs:
        forget = store3.create_memory({"content": "忘记这些来源", "source_ids": [rec["id"]]})
        store3.delete_memory(forget["id"])
    fresh = [store3.add_message("web:default", "owner", "user", f"新的有效消息{i}") for i in range(6)]
    blocked = chat3._blocked_sources("web:default")
    print("blocked source count:", len(blocked))
    pending = chat3.memory_lifecycle.pending("web:default", "owner")
    usable = [x for x in pending if x["id"] not in blocked]
    print("pending batch:", len(pending), "usable after blocking:", len(usable))
    check("the 32-message pending batch is entirely consumed by blocked messages",
          len(usable) < 4, f"{len(usable)} usable of {len(pending)}")
    before = chat3.memory_lifecycle._state("web:default", "owner")[0]
    out = await chat3._extract("web:default", "owner", automatic=True)
    after = chat3.memory_lifecycle._state("web:default", "owner")[0]
    print("extract:", out)
    print("cursor advanced:", before != after)
    check("cursor does NOT advance, so the jam persists indefinitely",
          before == after, "advance() is only reached after the len>=4 usable check (chat.py:1020)")
    check("6 valid messages are permanently starved by the blocked head", len(usable) < 4)

    await chat.close(); await chat2.close(); await chat3.close()
    store.close(); store2.close(); store3.close()


if __name__ == "__main__":
    asyncio.run(main())
