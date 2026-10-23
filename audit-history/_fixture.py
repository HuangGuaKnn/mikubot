"""Shared fixture: real Store + ChatService with a recording model.

Repo is read-only; every database lives under audit-history/tmp.
"""
from __future__ import annotations

import copy
import json
import shutil
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

REPO = Path(r"C:\Users\10316\Documents\deepseek-harness\default-workspace\mikubot")
sys.path.insert(0, str(REPO))

from mikubot.chat import ChatService  # noqa: E402
from mikubot.settings import DEFAULTS, resolve_model  # noqa: E402
from qunyu.db import Store  # noqa: E402

TMP = Path(__file__).with_name("tmp")
UTC = timezone.utc


class Settings:
    """Mutable settings object, same shape ChatService expects."""

    def __init__(self, **context):
        self.data = copy.deepcopy(DEFAULTS)
        self.data["model"].update(base_url="https://mock.invalid/v1", model="mock")
        self.data["context"].update(context)

    def get(self):
        return copy.deepcopy(self.data)


class Provider:
    """Records every model call; returns deterministic fixture text."""

    def __init__(self, settings, digest="DIGEST_FIXTURE：昨晚约好周日做饭。"):
        self.settings = settings
        self.calls = []
        self.digest = digest
        self.on_digest = None
        self.on_chat = None
        self.chat_n = 0

    def resolve(self, purpose):
        return resolve_model(self.settings.get(), purpose)

    async def complete(self, messages, **kwargs):
        purpose = kwargs.get("purpose", "chat")
        self.calls.append({"messages": copy.deepcopy(messages), "purpose": purpose, "kwargs": kwargs})
        if purpose == "context_digest":
            if self.on_digest:
                self.on_digest()
            content = self.digest
        elif purpose == "memory_extract":
            content = "[]"
        else:
            self.chat_n += 1
            content = self.on_chat(messages) if self.on_chat else f"CHAT_REPLY_{self.chat_n}"
        return {"content": content, "tool_calls": [],
                "message": {"role": "assistant", "content": content},
                "usage": {"input_tokens": 10, "output_tokens": 5}}

    @property
    def chat_calls(self):
        return [c for c in self.calls if c["purpose"] == "chat"]

    def sent(self, index=-1):
        call = self.chat_calls[index]
        return "\n".join(str(m["content"]) for m in call["messages"])

    def roles(self, index=-1):
        return [m["role"] for m in self.chat_calls[index]["messages"]]


def fresh_store(name):
    path = TMP / name
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True)
    return Store(path)


def iso(dt):
    return dt.astimezone(UTC).isoformat(timespec="microseconds").replace("+00:00", "Z")


def backdate(store, message_id, when):
    """Move a message in both the indexed column and the JSON payload."""
    stamp = iso(when)
    with store._lock, store._conn:
        row = store._conn.execute("SELECT data FROM messages WHERE id=?", (message_id,)).fetchone()
        record = json.loads(row[0])
        record["created_at"] = stamp
        store._conn.execute("UPDATE messages SET created_at=?, data=? WHERE id=?",
                            (stamp, json.dumps(record, ensure_ascii=False), message_id))
    return stamp


def seed_round(store, scope, user, n, *, content=None, t0=None, step_seconds=60):
    """Add n alternating user/assistant messages; return (records, timestamps)."""
    records, stamps = [], []
    when = t0
    for i in range(n):
        role = "user" if i % 2 == 0 else "assistant"
        uid = user if role == "user" else "assistant"
        text = content(i) if callable(content) else f"ROUND_{i}：{content or '讨论周日菜单。'}"
        record = store.add_message(scope, uid, role, text)
        if when is not None:
            backdate(store, record["id"], when)
            when = when + timedelta(seconds=step_seconds)
        records.append(record)
        stamps.append(record["created_at"])
    return records, stamps


def service(store, settings, provider):
    return ChatService(store, settings, provider)


def show(title):
    print("\n" + "=" * 78)
    print(title)
    print("=" * 78)


def check(label, condition, detail=""):
    print(f"[{'PASS' if condition else 'FAIL'}] {label}" + (f"  -> {detail}" if detail else ""))
    return bool(condition)
