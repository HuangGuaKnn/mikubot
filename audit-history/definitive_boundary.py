"""Definitive repro for the two boundary defects.

A) `_input_budget` (chat.py:682-684) can evict the digest system message while
   the reply still reports context_compressed=True and records the digest in the
   saved message metadata -> the model never saw the overnight summary.

B) `_history(limit=24)` (chat.py:490) is not round-aligned, so the window can
   begin with an assistant reply whose user question is outside the window.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from _fixture import Provider, Settings, check, fresh_store, seed_round, service, show

UTC = timezone.utc
YESTERDAY = datetime(2026, 10, 23, 13, 0, tzinfo=UTC)


async def main():
    show("A) digest evicted by _input_budget, yet reported as used")
    store = fresh_store("defA")
    settings = Settings(enabled=True, trigger_messages=4, max_chars=6000, keep_recent=1,
                        max_input_chars=2500)
    digest = "DIGEST_OVERNIGHT：" + ("昨晚的关键约定：周日十点集合，人数未定。" * 40)
    provider = Provider(settings, digest=digest)
    chat = service(store, settings, provider)
    store.upsert_scope({"id": "web:default", "context_compress": True, "auto_memory": False, "allow_tools": False})
    # A pinned memory makes the reference-data block large (it is system message #2).
    store.create_memory({"content": "参考记忆内容" * 200, "pinned": True})
    seed_round(store, "web:default", "owner", 20, content=lambda i: f"第{i}条。", t0=YESTERDAY, step_seconds=60)

    result = await chat.respond("web:default", "owner", "那后来呢")
    call = provider.chat_calls[-1]
    sent_text = "\n".join(str(m["content"]) for m in call["messages"])
    digest_ids = [r["id"] for r in store.list_memories() if r.get("property") == "conversation_digest"]
    saved = store.get_message(result["message_id"])
    prompt_roles = [m["role"] for m in call["messages"]]

    print("prompt roles:", prompt_roles)
    print("digest text present in prompt:", "DIGEST_OVERNIGHT" in sent_text)
    print("result['context_compressed']:", result["context_compressed"])
    print("digest id recorded in saved message memory_versions:",
          [d[:8] for d in saved["metadata"].get("memory_versions", {}) if d in digest_ids])
    print("digest id recorded in saved message context_source_ids:",
          [d[:8] for d in saved["metadata"].get("context_source_ids", []) if d in digest_ids])
    print("chars in prompt:", sum(len(str(m["content"])) for m in call["messages"]),
          "| max_input_chars:", settings.get()["context"]["max_input_chars"])

    check("the digest system message was EVICTED from the prompt",
          "DIGEST_OVERNIGHT" not in sent_text)
    check("the reply still reports context_compressed=True",
          result["context_compressed"] is True)
    check("the saved message records the digest as a used memory version",
          bool([d for d in saved["metadata"].get("memory_versions", {}) if d in digest_ids]),
          "provenance claims a digest the model never saw")

    show("A2) the digest survives once the reference block is smaller")
    store2 = fresh_store("defA2")
    settings2 = Settings(enabled=True, trigger_messages=4, max_chars=6000, keep_recent=1,
                         max_input_chars=8000)
    p2 = Provider(settings2, digest=digest)
    chat2 = service(store2, settings2, p2)
    store2.upsert_scope({"id": "web:default", "context_compress": True, "auto_memory": False, "allow_tools": False})
    seed_round(store2, "web:default", "owner", 20, content=lambda i: f"第{i}条。", t0=YESTERDAY, step_seconds=60)
    r2 = await chat2.respond("web:default", "owner", "那后来呢")
    s2 = "\n".join(str(m["content"]) for m in p2.chat_calls[-1]["messages"])
    check("with a larger budget the digest IS sent", "DIGEST_OVERNIGHT" in s2,
          f"compressed={r2['context_compressed']}")

    show("B) the 24-message window is not round-aligned (parity dependent)")
    store3 = fresh_store("defB")
    p3 = Provider(settings)
    chat3 = service(store3, settings, p3)
    store3.upsert_scope({"id": "web:default", "context_compress": False, "auto_memory": False, "allow_tools": False})
    # Build history one message at a time; _history() is the real path used at chat.py:245.
    rows = []
    observed = []
    for n in range(1, 31):
        role = "user" if n % 2 == 1 else "assistant"
        uid = "owner" if role == "user" else "assistant"
        rows.append(store3.add_message("web:default", uid, role, f"消息{n}"))
        if n >= 25:
            window = chat3._history("web:default", limit=24, user_id="owner")
            observed.append((n, len(window), window[0]["role"], window[0]["content"], window[-1]["content"]))
    for n, size, first_role, first_content, last_content in observed:
        print(f"stored={n:2d} window={size} first={first_role:9s} ({first_content}) last=({last_content})")
    orphaned = [o for o in observed if o[2] == "assistant"]
    check("the window can begin with an ORPHANED assistant reply",
          bool(orphaned),
          f"{len(orphaned)} of {len(observed)} message counts produce an orphaned window start")
    check("the orphaned start is parity-dependent, not round-aligned",
          len(orphaned) != len(observed),
          "context.py:237 aligns to a user turn; chat.py:490 does not")
    # The orphaned assistant's user question is the previous message, which is outside the window.
    if orphaned:
        n = orphaned[0][0]
        window = chat3._history("web:default", limit=24, user_id="owner")
        idx = int(window[0]["content"].replace("消息", ""))
        outside = [r for r in rows if r["content"] == f"消息{idx - 1}"]
        print(f"orphaned assistant says 消息{idx}; its user question 消息{idx-1} is outside the window:",
              bool(outside) and outside[0]["id"] not in {m["id"] for m in window})
        check("the user turn that the orphaned reply answers is excluded from the window",
              bool(outside) and outside[0]["id"] not in {m["id"] for m in window})

    show("B2) the chat path can send that orphaned turn")
    # respond() adds the current user message before calling _history, shifting parity by one.
    store4 = fresh_store("defB2")
    p4 = Provider(settings)
    chat4 = service(store4, settings, p4)
    store4.upsert_scope({"id": "web:default", "context_compress": False, "auto_memory": False, "allow_tools": False})
    for n in range(1, 29):  # 28 stored + 1 current request = 29 -> window starts at message 6 (assistant)
        role = "user" if n % 2 == 1 else "assistant"
        store4.add_message("web:default", "owner" if role == "user" else "assistant", role, f"消息{n}")
    await chat4.respond("web:default", "owner", "那后来呢")
    hist4 = [m for m in p4.chat_calls[-1]["messages"] if m["role"] in ("user", "assistant")]
    print("chat path history first role:", hist4[0]["role"], "| first content:", str(hist4[0]["content"])[:24])
    check("the chat path sends an orphaned assistant turn", hist4[0]["role"] == "assistant",
          "28 stored + 1 current request => window starts on an assistant reply")

    await chat.close(); await chat2.close(); await chat3.close(); await chat4.close()
    store.close(); store2.close(); store3.close(); store4.close()


if __name__ == "__main__":
    asyncio.run(main())
