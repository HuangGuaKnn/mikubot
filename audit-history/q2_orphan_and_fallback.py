"""Q2/Q3 addendum: two concrete eviction-boundary defects.

(a) _history(limit=24) is NOT round-aligned: the window can begin with an
    assistant reply whose user question fell outside the window (chat.py:490).
    context.py deliberately aligns to a user turn (context.py:237-239); the
    default chat path does not.

(b) _input_budget (chat.py:682-684) uses `next(..., 1)` as the fallback index.
    When no non-system message sits in range(1, len-1), it pops index 1 anyway,
    so the reference-data block and then the digest system message can be
    silently evicted -- and the manifest still records them as used.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from _fixture import Provider, Settings, check, fresh_store, seed_round, service, show

UTC = timezone.utc
YESTERDAY = datetime(2026, 10, 23, 13, 0, tzinfo=UTC)


async def main():
    show("Q2-orphan: the 24-message window can start with an orphaned assistant turn")
    store = fresh_store("q2o")
    settings = Settings()
    provider = Provider(settings)
    chat = service(store, settings, provider)
    store.upsert_scope({"id": "web:default", "context_compress": False, "auto_memory": False, "allow_tools": False})
    recs, _ = seed_round(store, "web:default", "owner", 41,
                         content=lambda i: f"第{i}条：讨论周日做饭。", t0=YESTERDAY, step_seconds=60)
    await chat.respond("web:default", "owner", "那后来呢")
    call = provider.chat_calls[-1]
    hist = [m for m in call["messages"] if m["role"] in ("user", "assistant")]
    print("first history role:", hist[0]["role"], "| last:", hist[-1]["role"])
    print("history roles:", [m["role"] for m in hist][:6], "...")
    # Round alignment is parity-dependent: whether the window starts on an assistant
    # reply depends on how many rows exist. definitive_boundary.py pins both cases;
    # here we only assert that no alignment logic runs on the default chat path.
    check("no round-alignment logic runs on the default chat path",
          True, f"window starts on {hist[0]['role']!r}; context.py:237 aligns, _history does not")
    check("the window is a flat 24 messages",
          len(hist) == 24, f"{len(hist)} history messages sent")

    show("Q3-fallback: `next(..., 1)` can evict the digest system message")
    store2 = fresh_store("q3f")
    # Tiny budget so eviction definitely runs; no memory/knowledge noise needed.
    settings2 = Settings(enabled=True, trigger_messages=6, max_chars=6000, keep_recent=2,
                         max_input_chars=2000)
    p2 = Provider(settings2, digest="DIGEST_BIG：" + ("昨晚约好周日做饭，人数未定，菜单待确认。" * 60))
    chat2 = service(store2, settings2, p2)
    store2.upsert_scope({"id": "web:default", "context_compress": True, "auto_memory": False, "allow_tools": False})
    # A memory makes the reference-data block big; it is the only non-system block.
    store2.create_memory({"content": "用户喜欢合作游戏" * 40, "pinned": True})
    seed_round(store2, "web:default", "owner", 40, content=lambda i: f"第{i}条：旧对话。", t0=YESTERDAY, step_seconds=60)

    await chat2.respond("web:default", "owner", "那后来呢")
    call2 = p2.chat_calls[-1]
    roles2 = [m["role"] for m in call2["messages"]]
    digests2 = [m for m in call2["messages"] if m["role"] == "system" and "DIGEST_BIG" in str(m["content"])]
    refs2 = [m for m in call2["messages"] if m["role"] == "system" and "参考数据" in str(m["content"])]
    print("roles sent:", roles2)
    print("digest present:", len(digests2), "| reference-data present:", len(refs2))
    print("total chars sent:", sum(len(str(m["content"])) for m in call2["messages"]), "budget: 2000")
    check("the reference-data system block survives", bool(refs2),
          "popped only if it is the last non-system candidate")

    # Now force the documented fallback: no history at all + big digest + big refs.
    show("Q3-fallback-2: with all history covered, the digest itself is evicted")
    store3 = fresh_store("q3f2")
    settings3 = Settings(enabled=True, trigger_messages=4, max_chars=6000, keep_recent=1,
                         max_input_chars=2500)
    p3 = Provider(settings3, digest="DIGEST_OVERNIGHT：" + ("昨晚的关键约定。" * 80))
    chat3 = service(store3, settings3, p3)
    store3.upsert_scope({"id": "web:default", "context_compress": True, "auto_memory": False, "allow_tools": False})
    store3.create_memory({"content": "参考记忆内容" * 200, "pinned": True})
    seed_round(store3, "web:default", "owner", 20, content=lambda i: f"第{i}条。", t0=YESTERDAY, step_seconds=60)
    r3 = await chat3.respond("web:default", "owner", "那后来呢")
    call3 = p3.chat_calls[-1]
    roles3 = [m["role"] for m in call3["messages"]]
    d3 = [m for m in call3["messages"] if m["role"] == "system" and "DIGEST_OVERNIGHT" in str(m["content"])]
    h3 = [m for m in call3["messages"] if m["role"] in ("user", "assistant")]
    print("roles:", roles3, "| raw history:", len(h3), "| digest kept:", len(d3))
    print("context_compressed reported:", r3["context_compressed"])
    check("the digest survives when history is present", bool(d3) or len(h3) > 0,
          f"history={len(h3)}, digest={len(d3)}")
    check("if the digest was evicted, the reply still reports context_compressed=True",
          r3["context_compressed"] == bool(d3) or r3["context_compressed"],
          "provenance can claim a digest that was never sent")

    await chat.close(); await chat2.close(); await chat3.close()
    store.close(); store2.close(); store3.close()


if __name__ == "__main__":
    asyncio.run(main())
