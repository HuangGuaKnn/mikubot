"""CRITICAL: does the explicit time-recall (_time_history) actually reach the model?

chat.py:246-249 merges `_time_history` records into `history`, but `_time_history`
REWRITES content (adds a 【历史消息 <created_at>】 header and truncates to 600 chars).
ContextEngine._manifest (context.py:165-166) compares
    message_fingerprint(store.get_message(id)) != message_fingerprint(original)
and drops any record whose stored fingerprint differs. Since the dated record's
content was mutated, every time-recalled message is silently discarded.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from _fixture import Provider, Settings, check, fresh_store, seed_round, service, show

UTC = timezone.utc
YESTERDAY = datetime(2026, 10, 23, 13, 0, tzinfo=UTC)


async def main():
    store = fresh_store("crit")
    settings = Settings()
    provider = Provider(settings)
    chat = service(store, settings, provider)
    store.upsert_scope({"id": "web:default", "context_compress": False, "auto_memory": False, "allow_tools": False})
    seed_round(store, "web:default", "owner", 60,
               content=lambda i: ("用户开场：周日做饭人数未定" if i == 0 else f"昨晚第{i}条。"),
               t0=YESTERDAY, step_seconds=60)

    show("step 1: _time_history returns records with rewritten content")
    dated = chat._time_history("web:default", "owner", "昨天说到哪了")
    print("dated records:", len(dated))
    print("first dated content:", dated[0]["content"][:70].replace("\n", " "))
    stored = store.get_message(dated[0]["id"])
    check("dated content is prefixed with 【历史消息 ...】",
          dated[0]["content"].startswith("【历史消息 "))
    check("dated content differs from the stored message content",
          dated[0]["content"] != stored["content"])

    show("step 2: the context engine's manifest drops them")
    from mikubot.context import ContextEngine
    engine = chat.context
    valid, sources, mem, jar = engine._manifest("web:default", "owner", dated)
    print("input:", len(dated), "| survived _manifest:", len(valid))
    check("EVERY time-recalled message is dropped by _manifest", len(valid) == 0,
          "context.py:165 fingerprint mismatch on mutated content")

    show("step 3: same thing through ContextEngine.build (the real call at chat.py:250)")
    built = await engine.build("web:default", "owner", dated)
    print("build messages:", len(built["messages"]), "reason:", built["reason"])
    check("build() returns none of the time-recalled messages",
          len(built["messages"]) == 0, f"reason={built['reason']}")

    show("step 4: end-to-end -- the dated recall never reaches the prompt")
    await chat.respond("web:default", "owner", "昨天说到哪了")
    call = provider.chat_calls[-1]
    sent = "\n".join(str(m["content"]) for m in call["messages"])
    print("prompt history entries:", len([m for m in call["messages"] if m["role"] in ("user", "assistant")]))
    check("no 【历史消息】 header anywhere in the prompt", "【历史消息" not in sent)
    check("the opening request from yesterday is absent", "用户开场" not in sent)

    show("step 5: confirm the same for a multi-day-old message that the window excludes")
    # A message far older than the 24-window but inside the '最近' 30-day window.
    old = store.add_message("web:default", "owner", "user", "三天前约定：周日十点集合")
    from _fixture import backdate
    backdate(store, old["id"], YESTERDAY - timedelta(days=2))
    dated2 = chat._time_history("web:default", "owner", "最近说到哪了")
    ids2 = {r["id"] for r in dated2}
    print("最近 recall contains the 3-day-old message:", old["id"] in ids2)
    built2 = await engine.build("web:default", "owner", dated2)
    check("even the 最近 window's old messages are dropped by _manifest",
          old["id"] not in {m["id"] for m in built2["messages"]})

    await chat.close()
    store.close()


if __name__ == "__main__":
    asyncio.run(main())
