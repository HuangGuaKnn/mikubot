"""Q6: memory-extraction cursor `since = now - 1 day`.

memory_lifecycle.py:22,30-34,79-88. The first extraction after a night starts its
cursor at now-24h, so anything older than 24h is never extracted. This script
drives the real MemoryLifecycle + ChatService._extract path.
"""
from __future__ import annotations

import asyncio
import json
from datetime import datetime, timedelta, timezone

from _fixture import Provider, Settings, backdate, check, fresh_store, seed_round, service, show

UTC = timezone.utc
NOW = datetime.now(UTC)


class ExtractProvider(Provider):
    """Returns a real candidate JSON so we can see which messages get extracted."""

    def __init__(self, settings):
        super().__init__(settings)
        self.extract_inputs = []

    async def complete(self, messages, **kwargs):
        if kwargs.get("purpose") == "memory_extract":
            payload = json.loads(messages[-1]["content"])
            self.extract_inputs.append(payload)
            candidates = []
            for item in payload[:2]:
                candidates.append({"content": f"用户提到：{item['content'][:40]}", "kind": "fact",
                                   "subject": "owner", "property": "topic", "source_ids": [item["id"]],
                                   "confidence": 0.9})
            return {"content": json.dumps(candidates, ensure_ascii=False), "tool_calls": [],
                    "message": {"role": "assistant", "content": "[]"}, "usage": {}}
        return await super().complete(messages, **kwargs)


async def main():
    show("Q6a: cursor starts at now-1day and is persisted on first touch")
    store = fresh_store("q6")
    settings = Settings()
    provider = ExtractProvider(settings)
    chat = service(store, settings, provider)
    store.upsert_scope({"id": "web:default", "context_compress": False, "auto_memory": True, "allow_tools": False})

    cursor_key = "memory-progress-" + __import__("hashlib").sha256(b"web:default\x00owner").hexdigest()[:32]
    state = chat.memory_lifecycle._state("web:default", "owner")
    print("initial state:", state)
    print("cursor_at - now (hours):", (datetime.fromisoformat(state[0]) - NOW).total_seconds() / 3600)
    check("cursor starts exactly 24h in the past",
          abs((datetime.fromisoformat(state[0]) - (NOW - timedelta(days=1))).total_seconds()) < 60,
          state[0])
    saved = store._get("events", cursor_key)["details"]
    print("persisted event details:", saved)
    check("the 1-day cursor is persisted immediately on first read",
          saved.get("cursor_at") == state[0])

    show("Q6b: overnight messages older than 24h are never pending for extraction")
    # Yesterday 21:00 local (13:00Z) -> within 24h at 02:50 local but let's use 2 nights back
    two_nights = NOW - timedelta(days=1, hours=10)
    old_records, _ = seed_round(store, "web:default", "owner", 6,
                                content=lambda i: f"前天晚上的重要约定第{i}条。", t0=two_nights, step_seconds=60)
    recent_records, _ = seed_round(store, "web:default", "owner", 6,
                                   content=lambda i: f"刚刚说的话第{i}条。",
                                   t0=NOW - timedelta(minutes=20), step_seconds=60)
    pending = chat.memory_lifecycle.pending("web:default", "owner")
    pending_ids = {r["id"] for r in pending}
    print("pending count:", len(pending))
    check("messages older than the 24h cursor are NOT pending",
          not (pending_ids & {r["id"] for r in old_records}),
          "the overnight thread is invisible to extraction")
    check("messages inside the cursor window are pending",
          bool(pending_ids & {r["id"] for r in recent_records}))

    show("Q6c: end-to-end _extract only ever sees the post-cursor messages")
    result = await chat._extract("web:default", "owner", automatic=False)
    print("extract result:", result)
    seen = provider.extract_inputs[-1] if provider.extract_inputs else []
    seen_ids = {x["id"] for x in seen}
    print("model saw", len(seen), "messages")
    check("the extraction model never sees the >24h-old overnight messages",
          not (seen_ids & {r["id"] for r in old_records}))
    created = [m for m in store.list_memories() if m.get("property") == "topic"]
    print("candidate memories created:", len(created))
    check("no long-term memory is produced from the pre-cursor overnight thread",
          all(not any(o["id"] in (m.get("source_ids") or []) for o in old_records) for m in created))

    show("Q6d: cursor only advances on success; failures retry, but the 24h floor still bites")
    # simulate a first-ever day where extraction fails repeatedly
    store2 = fresh_store("q6d")
    p2 = ExtractProvider(settings)
    chat2 = service(store2, settings, p2)
    store2.upsert_scope({"id": "web:default", "context_compress": False, "auto_memory": True, "allow_tools": False})
    st = chat2.memory_lifecycle._state("web:default", "owner")
    print("fresh cursor:", st[0], "id:", repr(st[1]))
    check("cursor_id starts empty", st[1] == "")
    recs, _ = seed_round(store2, "web:default", "owner", 4, content=lambda i: f"消息{i}", t0=NOW - timedelta(minutes=5), step_seconds=10)
    before = chat2.memory_lifecycle._state("web:default", "owner")
    p2.complete = lambda *a, **k: (_ for _ in ()).throw(RuntimeError("model down"))
    out = await chat2._extract("web:default", "owner", automatic=False)
    after = chat2.memory_lifecycle._state("web:default", "owner")
    print("after failure:", out, "cursor:", after[0], "error:", after[3])
    check("a failed extraction does not advance the cursor", before[0] == after[0])
    check("the failure is recorded on the cursor", after[3] != "" or out.get("skipped"))

    await chat.close(); await chat2.close()
    store.close(); store2.close()


if __name__ == "__main__":
    asyncio.run(main())
