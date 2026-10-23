"""Remaining checks: time anchor, content truncation, hard budget failure, dated-merge dedup."""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from _fixture import Provider, Settings, check, fresh_store, seed_round, service, show

UTC = timezone.utc
YESTERDAY = datetime(2026, 10, 23, 13, 0, tzinfo=UTC)


async def main():
    show("M1: the ONLY overnight anchor in the prompt is the wall-clock line")
    store = fresh_store("m1")
    settings = Settings()
    provider = Provider(settings)
    chat = service(store, settings, provider)
    store.upsert_scope({"id": "web:default", "context_compress": False, "auto_memory": False, "allow_tools": False})
    seed_round(store, "web:default", "owner", 6, content=lambda i: f"昨晚第{i}条。", t0=YESTERDAY, step_seconds=60)
    await chat.respond("web:default", "owner", "那后来呢")
    system = provider.chat_calls[-1]["messages"][0]["content"]
    print("system head:", system[:220].replace("\n", " | "))
    check("the system prompt carries the current wall clock", "【现实时间】" in system)
    check("the system prompt does NOT describe the overnight gap or the last topic",
          "昨晚" not in system and "上次" not in system and "之前讨论" not in system,
          "no explicit conversation-continuity mechanism exists")
    check("the prompt asks the model not to treat old messages as now",
          "不把旧消息的时间当成现在" in system)

    show("M2: a long history message is silently truncated to 5000 chars (chat.py:640)")
    store2 = fresh_store("m2")
    p2 = Provider(settings)
    chat2 = service(store2, settings, p2)
    store2.upsert_scope({"id": "web:default", "context_compress": False, "auto_memory": False, "allow_tools": False})
    long_msg = "开头很重要：" + ("中段内容。" * 3000) + "结尾结论：周日十点集合。"
    rec = store2.add_message("web:default", "owner", "user", long_msg)
    await chat2.respond("web:default", "owner", "那后来呢")
    hist = [m for m in p2.chat_calls[-1]["messages"] if m["role"] == "user" and str(m["content"]).startswith("开头很重要")]
    print("stored length:", len(long_msg), "| sent length:", len(hist[0]["content"]) if hist else 0)
    check("the stored message is 5000+ chars", len(long_msg) > 5000)
    check("the prompt copy is truncated to exactly 5000 chars",
          hist and len(hist[0]["content"]) == 5000)
    check("the conclusion at the end of that message is LOST", "结尾结论" not in hist[0]["content"])

    show("M3: required > maximum raises instead of replying")
    store3 = fresh_store("m3")
    settings3 = Settings(max_input_chars=2000)
    p3 = Provider(settings3)
    chat3 = service(store3, settings3, p3)
    store3.upsert_scope({"id": "web:default", "context_compress": False, "auto_memory": False, "allow_tools": False})
    try:
        await chat3.respond("web:default", "owner", "长" * 2500)
        check("a request over max_input_chars raises ValueError", False, "no error raised")
    except ValueError as exc:
        check("a request over max_input_chars raises ValueError", True, str(exc)[:60])
    check("no model call was made", len(p3.chat_calls) == 0)

    show("M4: dated history merged with the 24-window -- the merge is a no-op because of D2")
    store4 = fresh_store("m4")
    p4 = Provider(settings)
    chat4 = service(store4, settings, p4)
    store4.upsert_scope({"id": "web:default", "context_compress": False, "auto_memory": False, "allow_tools": False})
    seed_round(store4, "web:default", "owner", 40, content=lambda i: f"昨晚第{i}条。", t0=YESTERDAY, step_seconds=60)
    await chat4.respond("web:default", "owner", "昨天说到哪了")
    call4 = p4.chat_calls[-1]
    users = [m for m in call4["messages"] if m["role"] == "user"]
    prefixed = [m for m in users if str(m["content"]).startswith("【历史消息")]
    print("user turns sent:", len(users), "| time-prefixed:", len(prefixed))
    check("no time-prefixed turn reaches the model (D2 discards the whole dated set)",
          len(prefixed) == 0,
          "the merge at chat.py:248 is a no-op: _manifest drops every rewritten record")

    await chat.close(); await chat2.close(); await chat3.close(); await chat4.close()
    store.close(); store2.close(); store3.close(); store4.close()


if __name__ == "__main__":
    asyncio.run(main())
