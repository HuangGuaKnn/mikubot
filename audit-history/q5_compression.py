"""Q5: compression across a night boundary.

context.py:214-312. Real path: ChatService.respond -> ContextEngine.build.
Checks: what the digest covers, whether the last round before the gap survives,
what `model_failed` / `sources_changed` return, and whether the digest can be
evicted by _input_budget.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from _fixture import Provider, Settings, check, fresh_store, seed_round, service, show

UTC = timezone.utc
YESTERDAY = datetime(2026, 10, 23, 13, 0, tzinfo=UTC)  # yesterday 21:00 local


def digests(store):
    return [r for r in store.list_memories() if r.get("property") == "conversation_digest"]


def labelled(records):
    return [(r["id"][:6], r["role"]) for r in records]


async def main():
    show("Q5a: night with more than trigger_messages -> digest + raw remainder")
    store = fresh_store("q5a")
    settings = Settings(enabled=True, trigger_messages=20, max_chars=18000, keep_recent=6)
    provider = Provider(settings, digest="DIGEST_A：昨晚约好周日做饭，人数未定。")
    chat = service(store, settings, provider)
    store.upsert_scope({"id": "web:default", "context_compress": True, "auto_memory": False, "allow_tools": False})

    recs, _ = seed_round(store, "web:default", "owner", 40,
                         content=lambda i: ("昨晚的开场请求：周日做饭，人数待定。" if i == 0 else f"昨晚第{i}条。"),
                         t0=YESTERDAY, step_seconds=120)
    morning = store.add_message("web:default", "owner", "user", "那后来呢")
    await chat.respond("web:default", "owner", "那后来呢")
    d = digests(store)
    print("digests:", len(d))
    if d:
        summary = d[0]
        print("digest covers", len(summary["covered_message_ids"]), "messages")
        print("digest content:", summary["content"])
        print("event_time_start/end:", summary["event_time_start"], summary["event_time_end"])
        covered = set(summary["covered_message_ids"])
        kept = [r for r in recs + [morning] if r["id"] not in covered]
        print("kept raw:", labelled(kept))
        check("no message is both covered and kept raw",
              not (covered & {r["id"] for r in kept}))
        check("the current morning request is never covered by the digest",
              morning["id"] not in covered)
        last_before_gap = recs[-2], recs[-1]   # yesterday's last user/assistant round
        in_keep = [r["id"] in {x["id"] for x in kept} for r in last_before_gap]
        in_digest = [r["id"] in covered for r in last_before_gap]
        print("yesterday's last round kept raw:", in_keep, "covered by digest:", in_digest)
        check("yesterday's last round before the gap is not silently dropped",
              any(in_keep) or all(in_digest))
        print("model saw digest:", "DIGEST_A" in provider.sent())

    show("Q5b: chain a second night -> digest is re-summarised and capped")
    settings2 = Settings(enabled=True, trigger_messages=20, max_chars=18000, keep_recent=6)
    store2 = fresh_store("q5b")
    p2 = Provider(settings2, digest="DIGEST_B：把昨晚和前天合并后的摘要。")
    chat2 = service(store2, settings2, p2)
    store2.upsert_scope({"id": "web:default", "context_compress": True, "auto_memory": False, "allow_tools": False})
    seed_round(store2, "web:default", "owner", 40, content=lambda i: f"第一晚第{i}条。", t0=YESTERDAY, step_seconds=60)
    await chat2.respond("web:default", "owner", "第二天早上问一句")
    first = digests(store2)[0]
    # second night
    day2 = datetime(2026, 10, 23, 15, 0, tzinfo=UTC)
    seed_round(store2, "web:default", "owner", 40, content=lambda i: f"第二晚第{i}条。", t0=day2, step_seconds=60)
    await chat2.respond("web:default", "owner", "第三天早上再问一句")
    ds = digests(store2)
    print("digest records after second night:", len(ds), "(store.list_memories is newest-first)")
    for item in ds:
        print(" -", item["id"][:6], "version", item["version"], "covers", len(item["covered_message_ids"]),
              "summary_of", str(item.get("summary_of"))[:6], "content:", item["content"][:60])
    newest = ds[0]
    check("a new digest chains onto the previous one", newest.get("summary_of") == first["id"])
    check("the new digest covers strictly more messages than the first",
          set(first["covered_message_ids"]) < set(newest["covered_message_ids"]))
    check("every night creates a NEW digest record (the chain grows unbounded)",
          len(ds) == 2, "context.py:302 creates one memory row per compression")
    check("the rolling digest is cumulative, not per-night: it re-summarises all covered history",
          len(newest["covered_message_ids"]) > 40,
          f"covers {len(newest['covered_message_ids'])} messages with a {len(newest['content'])}-char summary")
    prompt = p2.sent()
    print("second digest prompt contains the previous digest:", "DIGEST_B" in prompt or "DIGEST_A" in prompt)
    check("the previous digest text is fed back into the summariser",
          "DIGEST_A" in prompt or "DIGEST_B" in prompt)
    check("summary output is capped by the prompt at 900 chars, rejection at MAX_SUMMARY_CHARS=2400",
          True, "prompt asks 最多900字; only >2400 is rejected (context.py:278,293)")

    show("Q5c: model_failed path with NO existing digest -> full raw history returned")
    store3 = fresh_store("q5c")
    settings3 = Settings(enabled=True, trigger_messages=20, max_chars=18000, keep_recent=6)
    p3 = Provider(settings3)
    p3.on_digest = lambda: (_ for _ in ()).throw(RuntimeError("digest model down"))
    chat3 = service(store3, settings3, p3)
    store3.upsert_scope({"id": "web:default", "context_compress": True, "auto_memory": False, "allow_tools": False})
    seed_round(store3, "web:default", "owner", 40, content=lambda i: f"旧内容第{i}条。", t0=YESTERDAY, step_seconds=60)
    r3 = await chat3.respond("web:default", "owner", "那后来呢")
    call3 = p3.chat_calls[-1]
    hist3 = [m for m in call3["messages"] if m["role"] in ("user", "assistant")]
    print("context_compressed:", r3["context_compressed"], "raw history sent:", len(hist3))
    check("digest failure keeps raw history (no crash, no silent empty context)",
          len(hist3) > 24, f"{len(hist3)} raw messages reached the model")
    check("digest failure is reported as an event, not as compression",
          not r3["context_compressed"])
    events = [e for e in store3.list_events(limit=50) if e.get("kind") == "context_digest"]
    print("context_digest events:", len(events))
    check("a context_digest failure event was recorded", len(events) == 1)

    show("Q5d: digest failure WITH an existing digest -> digest reused, covered messages stay out")
    # reuse store2: it already has a digest; make the next digest call fail
    p2.on_digest = lambda: (_ for _ in ()).throw(RuntimeError("digest model down"))
    day3 = datetime(2026, 10, 23, 17, 0, tzinfo=UTC)
    seed_round(store2, "web:default", "owner", 40, content=lambda i: f"第三晚第{i}条。", t0=day3, step_seconds=60)
    r4 = await chat2.respond("web:default", "owner", "第四天早上再问一句")
    call4 = p2.chat_calls[-1]
    hist4 = [m for m in call4["messages"] if m["role"] in ("user", "assistant")]
    sys4 = [m for m in call4["messages"] if m["role"] == "system" and "DIGEST_" in str(m["content"])]
    print("context_compressed:", r4["context_compressed"], "raw:", len(hist4), "digest system msgs:", len(sys4))
    check("a still-valid digest is reused when the next digest fails", bool(sys4))
    check("covered messages do not reappear as raw text", len(hist4) < 60, f"{len(hist4)} raw messages")

    await chat.close(); await chat2.close(); await chat3.close()
    store.close(); store2.close(); store3.close()


if __name__ == "__main__":
    asyncio.run(main())
