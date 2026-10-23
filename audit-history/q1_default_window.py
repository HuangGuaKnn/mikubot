"""Q1/Q2: after an overnight gap, how much history reaches the model in the DEFAULT config?

Default config: context.enabled=false, no manual digest, context_compress default.
Real path: ChatService.respond -> _history(limit=24) -> ContextEngine.build -> _context.
"""
from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timedelta, timezone

from _fixture import Provider, Settings, check, fresh_store, iso, seed_round, service, show

UTC = timezone.utc


async def main():
    store = fresh_store("q1")
    settings = Settings()  # DEFAULT context: enabled=False, keep_recent=24, max_history_messages=400
    provider = Provider(settings)
    chat = service(store, settings, provider)
    store.upsert_scope({"id": "web:default", "context_compress": False, "auto_memory": False, "allow_tools": False})

    # Yesterday 21:00 local (UTC+8) => 13:00 UTC on the previous calendar day.
    # "Today" for this run is 2026-10-24 local, so yesterday evening is 2026-10-23 13:00Z.
    evening = datetime(2026, 10, 23, 13, 0, tzinfo=UTC)
    t0 = evening

    def text(i):
        if i == 0:
            return "帮我规划一下周日的做饭活动，先列个初步方案，我等下补充人数。"
        if i == 1:
            return "好，我先按 6 人准备；等你确认人数后再调整菜单。"
        return f"晚上闲聊第{i}条：随便聊聊。"

    records, _ = seed_round(store, "web:default", "owner", 40, content=text, t0=t0, step_seconds=120)
    print("seeded", len(records), "messages yesterday evening;",
          "first:", records[0]["created_at"], "last:", records[-1]["created_at"])

    # Overnight gap, then this morning's plain follow-up at 09:10 local (01:10 UTC).
    print("morning request: 那后来呢  (no explicit time word)")
    result = await chat.respond("web:default", "owner", "那后来呢")
    sent = provider.sent()
    roles = provider.roles()
    print("model saw roles:", roles)

    # Which stored messages actually made it?
    sent_ids = {m["id"] for m in store.list_messages("web:default", limit=400)}
    history_msgs = [m for m in store.list_messages("web:default", limit=400) if m["role"] in ("user", "assistant")]
    in_window = [m for m in history_msgs if m["content"][:20] in sent or m["content"] in sent]
    print("stored user/assistant messages:", len(history_msgs))
    print("messages whose text appears in the prompt:", len(in_window))
    print("ORIGINAL request present in prompt:", "初步方案" in sent)
    print("assistant partial answer present:", "按 6 人准备" in sent)
    print("reply:", result["reply"], "context_compressed:", result["context_compressed"])

    show("Q1: coverage of the last 24")
    check("window is exactly 24 history slots (23 prior + current request)", len(roles) == 26,
          f"system x2 + history {len(roles) - 3} + current user = {len(roles)}")
    check("the original request from last night is DROPPED", "初步方案" not in sent)
    check("the assistant's partial answer is DROPPED", "按 6 人准备" not in sent)
    check("the tail of last night's chit-chat survives", "晚上闲聊第39条" in sent)

    # Q2: is there any continuity mechanism? Look for any summary/continuity system message.
    continuity = [m for m in provider.chat_calls[-1]["messages"]
                  if m["role"] == "system" and ("摘要" in str(m["content"]) or "背景资料" in str(m["content"]))]
    check("no digest/continuity system message is injected", not continuity,
          f"{len(continuity)} found; context_compressed={result['context_compressed']}")

    # How many stored messages are newer than the 24-window boundary?
    all_msgs = store.list_messages("web:default", limit=400)
    dropped = [m for m in all_msgs if m["id"] not in {x["id"] for x in in_window}]
    print(f"dropped from the window: {len(dropped)} messages (all older than the 24 newest)")
    print("newest dropped message:", dropped[-1]["content"][:40] if dropped else "-")

    # A night with fewer than 24 messages: show the window is message-count based, not round based.
    show("Q2: 24 counts MESSAGES, not rounds - one long exchange can consume it all")
    store2 = fresh_store("q1b")
    p2 = Provider(settings)
    chat2 = service(store2, settings, p2)
    store2.upsert_scope({"id": "web:default", "context_compress": False, "auto_memory": False, "allow_tools": False})
    recs, _ = seed_round(store2, "web:default", "owner", 30,
                         content=lambda i: ("用户的开场请求：讨论周日做饭。" if i == 0 else f"来回第{i}条。"),
                         t0=evening, step_seconds=60)
    await chat2.respond("web:default", "owner", "继续")
    s2 = p2.sent()
    check("start of an unfinished multi-message exchange is dropped after 30 messages",
          "用户的开场请求" not in s2, "24-message window covers only the last 12 rounds")

    await chat.close()
    await chat2.close()
    store.close()
    store2.close()


if __name__ == "__main__":
    asyncio.run(main())
