"""Q4: _time_history only fires on explicit time words.

chat.py:501-514 + memory.py:119-145. A plain follow-up gets NO time-bounded recall.
Also shows _time_history fetches role='user' only and caps at 24 with no rowid tie-break.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from _fixture import Provider, Settings, check, fresh_store, seed_round, service, show

UTC = timezone.utc


async def main():
    store = fresh_store("q4")
    settings = Settings()
    provider = Provider(settings)
    chat = service(store, settings, provider)
    store.upsert_scope({"id": "web:default", "context_compress": False, "auto_memory": False, "allow_tools": False})
    # Today is 2026-10-24 local (UTC+8); yesterday evening = 2026-10-23 21:00 local = 13:00Z.
    evening = datetime(2026, 10, 23, 13, 0, tzinfo=UTC)
    seed_round(store, "web:default", "owner", 40,
               content=lambda i: ("用户的问题：周日做饭人数还没定" if i == 0 else f"晚间对话第{i}条。"),
               t0=evening, step_seconds=120)

    show("Q4a: plain follow-up after a night -> no time-bounded recall")
    for text in ("那后来呢", "继续", "所以我们到底定了几个人"):
        dated = chat._time_history("web:default", "owner", text)
        check(f"_time_history({text!r}) == []", dated == [], f"returned {len(dated)} records")

    show("Q4b: explicit time word -> recall, but user messages only")
    dated = chat._time_history("web:default", "owner", "昨天说到哪了")
    print("records:", len(dated), "roles:", sorted({r['role'] for r in dated}))
    print("sample:", dated[0]["content"][:80].replace("\n", " ") if dated else "-")
    check("explicit 昨天 triggers recall", len(dated) > 0)
    check("only role='user' messages are recalled (no assistant replies)",
          all(r["role"] == "user" for r in dated))
    check("recalled user messages are truncated to 600 chars + a 【历史消息】 header",
          all(r["content"].startswith("【历史消息 ") for r in dated))
    check("recall is capped at 24 messages, not 24 rounds", len(dated) <= 24, f"{len(dated)}")

    show("Q4c: what the model actually receives for '昨天说到哪了'")
    await chat.respond("web:default", "owner", "昨天说到哪了")
    call = provider.chat_calls[-1]
    roles = [m["role"] for m in call["messages"]]
    print("roles:", roles)
    hist = [m for m in call["messages"] if m["role"] in ("user", "assistant")]
    prefixed = [m for m in hist if str(m["content"]).startswith("【历史消息")]
    print("history entries:", len(hist), "time-prefixed:", len(prefixed))
    check("time-recalled messages do NOT reach the model: _manifest drops them (D2)",
          not prefixed,
          f"{len(prefixed)} entries carry the 【历史消息】 header; expected 0 due to the D2 defect")
    check("the prompt falls back to the plain 24-message window",
          len(hist) == 24, f"{len(hist)} history entries, all unprefixed")
    check("the explicit 昨天 request therefore recovers nothing extra",
          "用户的问题：周日做饭人数还没定" not in "\n".join(str(m["content"]) for m in hist))

    await chat.close()
    store.close()


if __name__ == "__main__":
    asyncio.run(main())
