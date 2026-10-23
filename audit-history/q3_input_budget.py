"""Q3: _input_budget eviction order.

chat.py:667-685. `index = next((i for i in range(1, len(result)-1)
if result[i].get('role') != 'system'), 1)` -- pops the FIRST non-system message.
Reference data is the only system message after the two headers, so it survives,
and old history is always evicted oldest-first.
"""
from __future__ import annotations

import asyncio
import copy
from datetime import datetime, timedelta, timezone

from _fixture import Provider, Settings, check, fresh_store, seed_round, service, show

UTC = timezone.utc


class TinyBudget(Settings):
    def __init__(self, **context):
        super().__init__(**context)
        self.data["context"]["max_input_chars"] = 2000


async def main():
    show("Q3a: eviction order with a small max_input_chars")
    store = fresh_store("q3")
    settings = TinyBudget()
    provider = Provider(settings)
    chat = service(store, settings, provider)
    store.upsert_scope({"id": "web:default", "context_compress": False, "auto_memory": False, "allow_tools": False})
    evening = datetime(2026, 10, 22, 13, 0, tzinfo=UTC)
    seed_round(store, "web:default", "owner", 40, content=lambda i: f"第{i}条：旧对话内容，用于撑满输入预算。" * 3,
               t0=evening, step_seconds=60)
    await chat.respond("web:default", "owner", "那后来呢")
    call = provider.chat_calls[-1]
    kept = [m for m in call["messages"] if m["role"] in ("user", "assistant")]
    ref = [m for m in call["messages"] if m["role"] == "system" and "参考数据" in str(m["content"])]
    print("kept history messages:", len(kept), "reference-data system msg kept:", len(ref))
    check("old history is evicted oldest-first", len(kept) < 24 and len(kept) > 0,
          f"{len(kept)} history messages survive the 2000-char budget")
    check("the large reference-data system block is NOT evicted", bool(ref))
    check("the current request is intact", call["messages"][-1]["content"].endswith("那后来呢"))

    # Show that the budget protects system messages while raw history is cut, and
    # find the budget at which the digest itself starts being evicted (D3).
    show("Q3b: raw history is cut hard, system blocks survive")
    store2 = fresh_store("q3b")
    settings2 = TinyBudget(enabled=True, trigger_messages=6, max_chars=6000, keep_recent=2)
    p2 = Provider(settings2)
    chat2 = service(store2, settings2, p2)
    store2.upsert_scope({"id": "web:default", "context_compress": True, "auto_memory": False, "allow_tools": False})
    seed_round(store2, "web:default", "owner", 30, content=lambda i: f"第{i}条：讨论周日菜单与人数。" * 2,
               t0=evening, step_seconds=60)
    r2 = await chat2.respond("web:default", "owner", "那菜单接下来怎么安排？")
    call2 = p2.chat_calls[-1]
    roles2 = [m["role"] for m in call2["messages"]]
    print("roles sent:", roles2)
    sys_summaries = [m for m in call2["messages"] if m["role"] == "system" and "摘要" in str(m["content"])]
    hist2 = [m for m in call2["messages"] if m["role"] in ("user", "assistant")]
    print("context_compressed:", r2["context_compressed"], "| digest system msg sent:", len(sys_summaries))
    check("raw history is cut hard by the char budget", len(hist2) < 26,
          f"{len(hist2)} history messages kept")
    check("at this budget the digest is evicted while context_compressed is still True (D3)",
          r2["context_compressed"] and not sys_summaries,
          f"compressed={r2['context_compressed']}, digest_sent={len(sys_summaries)}")
    check("_input_budget protects system messages only while a non-system one remains",
          all(m["role"] == "system" or m["role"] == "user" for m in call2["messages"]))

    # A long request split across messages (the normal shape for a multi-message ask),
    # then the follow-up. Size the parts so the 2000-char floor (settings.py:570) forces
    # exactly the earlier part out while the later part still fits.
    show("Q3c: mid-exchange cut -- the budget drops the FIRST non-system message repeatedly")
    store3 = fresh_store("q3c")
    settings3 = TinyBudget()
    settings3.data["context"]["max_input_chars"] = 2000  # the documented minimum
    p3 = Provider(settings3)
    chat3 = service(store3, settings3, p3)
    store3.upsert_scope({"id": "web:default", "context_compress": False, "auto_memory": False, "allow_tools": False})
    parts = ["第一部分：背景说明。" * 130, "第二部分：我真正想让你做的事。" * 35]
    for part in parts:
        store3.add_message("web:default", "owner", "user", part)
    await chat3.respond("web:default", "owner", "那按这个做")
    call3 = p3.chat_calls[-1]
    print("part lengths:", [len(p) for p in parts])
    print("system length:", len(str(call3["messages"][0]["content"])))
    print("roles sent:", [m["role"] for m in call3["messages"]])
    print("prompt chars:", sum(len(str(m["content"])) for m in call3["messages"]), "| budget: 2000")
    sent3 = p3.sent()
    check("earlier parts of the unfinished request are evicted first",
          "第一部分" not in sent3 and "第二部分" in sent3,
          "the budget drops the oldest non-system message each iteration")
    check("the later part of the same unfinished request survives",
          "第二部分" in sent3)
    check("the current request survives intact", sent3.rstrip().endswith("那按这个做"))

    await chat.close(); await chat2.close(); await chat3.close()
    store.close(); store2.close(); store3.close()


if __name__ == "__main__":
    asyncio.run(main())
