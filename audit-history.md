# audit-history — overnight conversation continuity ("下文有点断裂")

Repo: `C:\Users\10316\Documents\deepseek-harness\default-workspace\mikubot` @ `pr-8`, HEAD `02d19ed` (read-only).
Python: `..\.venv\Scripts\python.exe`, run from repo root.
All repro scripts live in `audit-history/` and use the real code paths (`Store` + `ChatService` with a
recording fixture model, and direct `ContextEngine` / `MemoryLifecycle` calls). No repo file was modified.

Existing coverage: `..\.venv\Scripts\python.exe -m pytest -q tests/test_context_v3.py tests/test_context_chat_v3.py`
→ **31 passed**. Gaps are listed in §4.

---

## 1. Direct answers to the seven questions

| # | Question | Verdict |
|---|---|---|
| 1 | How many prior messages reach the model in the default config? Is 24 enough? | **23 prior messages** (24 slots minus the current request). Not enough: the window covers only the last night's *tail*, never the request that started the thread. |
| 2 | Does the window drop the start of an unfinished exchange? Any continuity mechanism? | **Yes**, the start is dropped. **No** continuity mechanism exists — the only candidate (`_time_history`) is silently discarded (D2). |
| 3 | `_input_budget` eviction order / can it cut mid-exchange or drop the summary? | Evicts oldest non-system first (correct for old history) **but the `next(..., 1)` fallback can evict the reference-data block and then the digest system message** while the reply still reports `context_compressed=True` (D3). |
| 4 | Does a plain follow-up after a night get time-bounded recall? | **No — and neither does an explicit 昨天/最近 query.** `_time_history` fires only on explicit time words *and* its output is dropped by `ContextEngine._manifest` (D2). |
| 5 | Compression across a night: boundary rules, `covered_message_ids`, failure paths? | Boundary/keep_recent/covered rules are **correct** (no double-count, last round preserved). Two real defects: compression can be permanently unreachable (D4) and an over-long digest is silently discarded (D5). |
| 6 | Does `since = now - 1 day` skip the overnight thread? | **Only on the first-ever extraction for a `(scope,user)` pair.** It is a one-time floor, *not* a rolling window. My initial hypothesis of "every night loses the thread" is **not reproducible** — see §3. |
| 7 | Ordering/timestamp issues around a night boundary? | `list_messages` is correct and rowid-stable. Three *different* total orders exist across the codebase for the same table, and `advance()` can skip a message (D7). |

---

## 2. Numbered defect list

Severity is relative to the reported symptom ("after a night the thread feels disconnected") in the
**default** configuration (`context.enabled=false`, no manual digest, `context_compress` default).

### D1 — HIGH — the 24-message window is a message count, not a round count, and nothing compensates
- **Where:** `mikubot/chat.py:245` (limit), `mikubot/chat.py:486-499` (`_history`), `mikubot/chat.py:490` (`list_messages(limit=limit)`)
- **Mechanism:** `history = self._history(scope_id, limit=400 if context_cfg.get('enabled') and scope.get('context_compress') else 24, ...)`. In the default config the limit is a flat **24 messages ≈ 12 rounds**. `_history` slices the newest N and never aligns to a round boundary. There is no summary, no "last topic" anchor, no continuity hint anywhere in the prompt.
- **Why 下文断裂:** A normal evening produces well over 24 messages. After the night, the model receives only the last ~12 rounds of *yesterday's* chit-chat. The user's opening request and the assistant's partial answer are gone, so a morning follow-up like "那后来呢" arrives with no antecedent. The only overnight signal left in the prompt is the wall-clock line (`chat.py:589-590`), which explicitly tells the model *not* to treat old messages as now.
- **Repro:** `..\.venv\Scripts\python.exe q1_default_window.py`
- **Result:** 40-message evening + morning "那后来呢" → prompt roles `system,system` + 23 history + current user = 26 messages. `ORIGINAL request present in prompt: False`; `assistant partial answer present: False`; `no digest/continuity system message is injected`; `context_compressed=False`.
- **Aggravator:** the window is parity-dependent — with 28 stored messages + the current request the window *starts on an assistant reply* whose user question is outside the window (see D9).

### D2 — HIGH — the only time-bounded recall path is dead code: `_time_history` output is discarded by the context engine
- **Where:** `mikubot/chat.py:246-249` (merge), `mikubot/chat.py:513` (content rewrite), `mikubot/context.py:165-166` (fingerprint check)
- **Mechanism:** `_time_history` returns copies whose `content` was rewritten to `f"【历史消息 {created_at}】\n" + content[:600]` (`chat.py:513`). `chat.py:248` merges those records into `history` and `chat.py:250` passes them to `ContextEngine.build`. Inside `_manifest`, each record is re-fetched from the store and compared:
  ```python
  if message_fingerprint(current) != message_fingerprint(original):
      continue
  ```
  `message_fingerprint` (`db.py:90-93`) hashes `content`, which was mutated — so **every** time-recalled message fails the check and is dropped before the prompt is built.
- **Why 下文断裂:** This is the mechanism that was supposed to recover "昨天/昨晚/最近" context after a gap. Because it is silently dead, a user cannot even repair the thread by asking "昨天说到哪了" — the bot answers as if no history were requested. Note this makes the code path look implemented and tested while having zero effect.
- **Repro:** `..\.venv\Scripts\python.exe crit_time_history_dropped.py`
- **Result:** `_time_history` returns 24 records; `_manifest` input 24 → **survived 0**; `ContextEngine.build` → 0 messages; end-to-end prompt contains `no 【历史消息】 header anywhere in the prompt`. Confirmed for both the 昨天 and 最近 windows, and for a message that the 24-window excludes.

### D3 — HIGH — `_input_budget` can evict the digest system message while the reply still claims compressed context
- **Where:** `mikubot/chat.py:667-685`, specifically the fallback at `chat.py:683`: `index = next((i for i in range(1, len(result)-1) if result[i].get('role') != 'system'), 1)`
- **Mechanism:** the generator searches `range(1, len(result)-1)` for a non-system message. If **no** non-system message exists in that range (all history covered by the digest), `next(..., 1)` returns the default `1` and the loop pops `result[1]` anyway — which is the reference-data system block or, once that is gone, the digest system message. The loop then continues until under budget, so the digest is evicted even though it is the only surviving record of the overnight context.
- **Why 下文断裂:** With compression enabled this is the worst case: the model receives *neither* the summary *nor* the covered raw history. Worse, the result still reports `context_compressed=True` and the digest id is written into the saved message's `memory_versions`, so provenance claims a digest the model never saw — the defect is invisible in the UI and in `result`.
- **Repro:** `..\.venv\Scripts\python.exe definitive_boundary.py` (section A) and `..\.venv\Scripts\python.exe q3_input_budget.py` (Q3b)
- **Result:** prompt roles `['system','user']`; `digest text present in prompt: False`; `result['context_compressed']: True`; `digest id recorded in saved message memory_versions: ['47a9c292']`; prompt only 1061 chars against a 2500-char budget. `definitive_boundary.py` A2 shows the digest *is* sent when the reference block is smaller, isolating the fallback as the cause.
- **Note:** at the default `max_input_chars=80000` the digest survived in my fixture (`final_checks.py`), so this is budget-dependent. It reproduces at `max_input_chars=2000/2500` (both inside the supported `[2000, 200000]` range, `settings.py:570`).

### D4 — HIGH — `max_history_messages` caps the engine's input, so automatic compression can never fire
- **Where:** `mikubot/chat.py:487` (`limit = min(limit, ...max_history_messages...)`) combined with `mikubot/context.py:232` (threshold test)
- **Mechanism:** `chat.py:245` asks for `limit=400` when compression is on, but `_history` clamps it to `context.max_history_messages`. `_build` then compares `len(remaining)` against `trigger_messages`. Whenever `max_history_messages < trigger_messages` the input can never reach the threshold, so the engine returns `below_threshold` forever and the digest model is never called.
- **Why 下文断裂:** The documented low-memory profile (`docs/LOW_MEMORY.md:41`) recommends **历史消息上限 16 条** while `trigger_messages` defaults to **60** (`settings.py:59`). On that profile the compressed-context feature is permanently dead: no summary is ever produced, so the bot falls back to D1's flat 24-message slicing at best (and 16 at worst) with no long-range context at all.
- **Repro:** `..\.venv\Scripts\python.exe compression_unreachable.py`
- **Result:** 200 messages stored; `_history(limit=400)` returns **16**; `build reason: below_threshold | compressed: False`; `context_digest model calls: 0`. Control with `max_history_messages=400` → `reason: compressed, compressed: True`.

### D5 — MEDIUM-HIGH — an over-long digest is silently discarded: no digest, no event, no retry, no truncation
- **Where:** `mikubot/context.py:293-296` (`len(text) > MAX_SUMMARY_CHARS`), `context.py:10` (`MAX_SUMMARY_CHARS = 2400`), prompt at `context.py:278` ("最多900字")
- **Mechanism:** the prompt asks for ≤900 characters, but the acceptance limit is 2400. When a model returns 900–2400+ characters the whole summary is thrown away (`reason="summary_exceeds_output_limit"`), no digest record is written, and — unlike the `model_failed` path (`context.py:288`) — **no `context_digest` event is recorded**, so the failure is silent and unretried.
- **Why 下文断裂:** After a long overnight session the summariser is most likely to be verbose exactly when the summary matters most. The compression silently does not happen, and the next request falls back to raw message slicing — i.e. D1 — with no user-visible indication that the overnight context was never captured.
- **Repro:** `..\.venv\Scripts\python.exe q5e_digest_too_long.py`
- **Result:** digest output 3503 chars → `reason: summary_exceeds_output_limit`, `compressed: False`, 60 raw messages returned, `digest records created: 0`, and no `context_digest` event. A 1123-char digest → `reason: compressed, compressed: True`.
- **Existing coverage:** `tests/test_context_v3.py:283` already asserts this reason plus "messages preserved / no memory written". It does **not** assert the operational consequence (compression never happens, so the overnight context is never summarised) nor that the path is silent (no event, no retry).

### D6 — MEDIUM — the memory-extraction cursor's `now - 1 day` is a one-time floor, not a rolling window
- **Where:** `mikubot/memory_lifecycle.py:21-28` (`_state`), specifically `since = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()`
- **Mechanism:** `since` is computed **only inside the `except KeyError` branch**, so it seeds `cursor_at` exactly once per `(scope, user)` and is never recomputed. After that the cursor only moves via `advance()` (`memory_lifecycle.py:40-44`). The `poll()` loop's own `since` (`memory_lifecycle.py:79`) is a separate 1-day scan window that only decides which conversations look idle.
- **Why 下文断裂:** The loss is real but **narrow**: everything older than 24 h at the moment a `(scope,user)` pair is first touched can never be extracted into long-term memory. This happens on first install, after restoring a backup, after a settings/data reset, or if the cursor event is pruned — i.e. the bot's first day of use silently skips the preceding history. Ordinary subsequent overnights are **not** affected.
- **Repro:** `..\.venv\Scripts\python.exe q6b_cursor_scope.py`
- **Result:** first cursor = `now - 24h` and is persisted immediately; a 30-hour-old message is **not** pending; 3-day- and 2-day-old messages are not pending; after seeding, an overnight-then-morning message **is** pending; a 6-message 5-day-old history yields `pending after seeding: 0`.

### D7 — MEDIUM — three inconsistent total orders over the same `messages` table; `advance()` can skip a message
- **Where:** `mikubot/db.py:538` (`ORDER BY created_at DESC,rowid DESC`), `mikubot/memory_lifecycle.py:33` (`ORDER BY created_at,id`), `mikubot/chat.py:508` (`ORDER BY created_at DESC` with no tie-break), `memory_lifecycle.py:42` (`max(records, key=lambda item: (item['created_at'], item['id']))`)
- **Mechanism:** `created_at` comes from `utc_now()` with microsecond precision (`db.py:86-87`), so ties are rare but not impossible (batch inserts, imports, restored backups, mocked clocks). When a tie occurs, `list_messages` breaks it by `rowid` (insertion order), `pending()` breaks it by the **random uuid4 text** of `id`, and `_time_history` does not break it at all. `advance()` uses the same `(created_at, id)` tuple as `pending()`, so the cursor is self-consistent with `pending()` but can be positioned *after* a message that `list_messages` (and therefore the chat history) orders earlier.
- **Why 下文断裂:** A message that the user saw in order can be skipped by extraction, or delivered in a different order than it was written, so the extracted "facts" and the displayed thread can disagree about sequence around the gap. Low probability per message, but it is a correctness gap in the boundary that a night creates (the largest batch of same-session messages).
- **Repro:** `..\.venv\Scripts\python.exe q7_ordering.py`
- **Result:** `list_messages` restores insertion order via rowid (`PASS`); `pending()` returns a completely different order (`['4de421','597ad4',...]` vs insertion `['e6f56f','5e9b65',...]`); in Q7d `advance()` moves the cursor to the lexicographically larger of two same-timestamp messages, leaving the other behind.
- **Not reproducible:** a real same-microsecond collision from normal chat traffic — I could not produce one without forcing timestamps.

### D8 — MEDIUM — history content is silently truncated to 5000 characters
- **Where:** `mikubot/chat.py:640` (`messages.append({'role': role, 'content': content[:5000]})`)
- **Mechanism:** every history message is hard-truncated at 5000 chars with no marker. `_time_history` applies a second, tighter truncation to 600 chars (`chat.py:513`).
- **Why 下文断裂:** A long overnight message (pasted plan, list, log) loses its tail — which is usually where the conclusion or the actual instruction is. The model sees an abruptly cut message and cannot tell it was truncated, so it answers the visible fragment. (`_context`'s own error message for the *current* request promises "不会截断任务要求" — `chat.py:678` — but that promise does not extend to history.)
- **Repro:** `..\.venv\Scripts\python.exe q8_misc.py` (M2)
- **Result:** stored length 15018 → sent length **exactly 5000**; `the conclusion at the end of that message is LOST`.

### D9 — LOW-MEDIUM — the default chat window is not round-aligned, so it can start with an orphaned assistant reply
- **Where:** `mikubot/chat.py:490` (no alignment) vs. `mikubot/context.py:237-239` (the compression path *does* align: `while boundary and remaining[boundary]["role"] != "user": boundary -= 1`)
- **Mechanism:** `_history` takes the newest 24 rows with no adjustment to a user turn. Depending on parity, the first history entry can be an assistant reply whose user question is outside the window.
- **Why 下文断裂:** The model opens on an answer to a question it cannot see, then must infer the topic from it — a literal "thread starts mid-sentence" effect. The inconsistency is notable: the compression path explicitly guards against this ("Keep the latest complete user/assistant round"), the default path does not.
- **Repro:** `..\.venv\Scripts\python.exe definitive_boundary.py` (section B)
- **Result:** over 6 consecutive message counts, **3 of 6** produce an orphaned window start (`stored=25 → first=assistant`); `the user turn that the orphaned reply answers is excluded from the window`; the full `respond()` path also sends an orphaned assistant turn (28 stored + 1 current request).

### D10 — LOW-MEDIUM — `_time_history`'s `LIMIT 24` returns the newest messages in the window, not the queried period
- **Where:** `mikubot/chat.py:508` (`ORDER BY created_at DESC LIMIT 24`), `mikubot/memory.py:141-142` (`最近`/`近期` → `now - 30 days`)
- **Mechanism:** for a wide window such as 最近 (30 days), the query orders newest-first and keeps 24, so a busy recent day crowds out the older part of the requested window.
- **Why 下文断裂:** "最近说到哪了" retrieves only the last few hours even though the user asked about a month; the model then confidently answers about the wrong period.
- **Repro:** `..\.venv\Scripts\python.exe final_checks.py` (section b)
- **Result:** 1 message from 5 days ago + 30 messages from today → 24 records returned, 5-day-old message **excluded**; with only 5 recent messages the old one **is** returned (confirming the crowding-out mechanism). In both cases `ContextEngine.build` still discards it (D2).

### D11 — LOW — a blocked head of the pending batch permanently starves memory extraction
- **Where:** `mikubot/memory_lifecycle.py:30-34` (`pending` batches 32 messages *including* blocked ones) + `mikubot/chat.py:1017-1021` (blocked filtered *after* the batch, then `len(records) < 4` → skip)
- **Mechanism:** when ≥29 consecutive forgotten messages occupy the front of the cursor queue, the 32-message batch contains fewer than 4 usable records, so `_extract` returns early and never reaches `advance()` (`chat.py:1052`). The cursor stays pinned and the same batch is re-fetched forever.
- **Why 下文断裂:** Any valid messages behind the blocked head are never extracted into long-term memory, so that conversation's facts are permanently missing from recall.
- **Repro:** `..\.venv\Scripts\python.exe q7_ordering.py` (Q7e)
- **Result:** 40 forgotten + 6 valid messages → `pending batch: 32 usable after blocking: 0`; `extract: 需要至少 4 条…未调用模型`; `cursor advanced: False`; `6 valid messages are permanently starved by the blocked head`.
- **Scope note:** my first attempt with 8 blocked messages did **not** reproduce this (6 usable of 14) — the effect needs roughly ≥29 consecutive blocked messages at the head. Narrow but real.

### D12 — LOW (currently unobservable because of D2) — time-recalled history is user-only and unmarked
- **Where:** `mikubot/chat.py:508` (`AND role='user'`), `mikubot/chat.py:513` (600-char cap), `mikubot/chat.py:248` (injected into the same list as real turns)
- **Mechanism:** only user messages are recalled, truncated to 600 chars, prefixed with `【历史消息 …】`, and appended to `history` as if they were ordinary prior turns. The system prompt never tells the model that some entries are time-bounded recall rather than recent dialogue.
- **Why 下文断裂:** had D2 not been present, the model would see one-sided, date-tagged fragments of the user's own past words with no assistant replies and no boundary marker, and could read them as new requests. Recorded for completeness; **not independently observable until D2 is fixed.**
- **Repro:** `..\.venv\Scripts\python.exe q4_time_history.py`

---

## 3. Explicitly not reproducible (no speculation)

- **"The `now - 1 day` cursor loses the overnight thread every night."** **False.** The floor is applied once, at first-ever use of a `(scope,user)` pair. Subsequent overnights are pending normally (`q6b_cursor_scope.py`, Q6b-3). Only pre-existing history at first touch is skipped (D6).
- **Compression boundary rules.** `covered_message_ids`, `remaining`, `keep_recent` and the user-turn alignment at `context.py:237-239` behave correctly: no message is both covered and kept raw; the last complete round before the gap is always preserved; the digest chain grows cumulatively without double-counting (`q5_compression.py`, Q5a/Q5b).
- **`model_failed` and `sources_changed` fallbacks.** Correct. A digest failure with no existing digest keeps all raw history, records a `context_digest` event and reports `context_compressed=False`; with a still-valid digest the digest is reused and covered messages stay out (`q5_compression.py`, Q5c/Q5d).
- **`db.list_messages` ordering.** Correct and rowid-stable for identical timestamps (`q7_ordering.py`, Q7a). No reordering around a night boundary from normal traffic.
- **`utc_now()` microsecond collisions from real chat traffic.** Not reproducible without forcing timestamps. D7 is a latent inconsistency, not an observed overnight reordering.
- **Digest eviction at the default `max_input_chars=80000`.** Did not reproduce with my fixture (the digest survived at 78874 chars); D3 reproduces at smaller supported budgets (2000–2500).

---

## 4. Test-coverage gaps

`tests/test_context_v3.py` + `tests/test_context_chat_v3.py` → 31 passed. Relevant gaps:

| Defect | Existing coverage | Gap |
|---|---|---|
| D1 | none | no test drives `respond()` with a default-config history longer than 24 messages; no assertion about which messages survive an overnight gap |
| D2 | none | `_time_history` is never exercised through `ContextEngine`; the fingerprint mismatch is untested |
| D3 | `tests/test_resource_limits.py:164-171` tests `_input_budget` with exactly **one** non-system message — the `next(..., 1)` fallback never fires | no test with a system-only middle section, and no assertion that a digest/`context_compressed=True` implies the digest was actually sent |
| D4 | `tests/test_resource_limits.py:114` sets `max_history_messages=16` only for settings validation | no test combining a low `max_history_messages` with `trigger_messages` and `context_compress=True` |
| D5 | `tests/test_context_v3.py:283` asserts reason + preserved messages + no memory | no assertion that compression silently never happens, and no `context_digest` event expectation |
| D6 | `tests/test_learning_remediation.py:26-37` covers cursor survival across restart | no test for the first-ever 1-day floor or for history older than the floor |
| D7 | none | no same-timestamp ordering test across `list_messages` / `pending` / `_time_history` |
| D8/D9/D10 | none | no truncation, round-alignment, or wide-window `LIMIT` tests |
| D11 | none | no blocked-head starvation test |

---

## 5. Most likely root causes (ranking)

1. **D1 — the flat 24-message window with no continuity compensation** (`chat.py:245`, `chat.py:486-499`).
   This is the direct cause in the reported default configuration. After any evening longer than 24 messages the
   opening request and the partial answer are outside the window, so the morning follow-up has no antecedent.
2. **D2 — the time-bounded recall path is silently dead** (`chat.py:513` vs `context.py:165`).
   This removes the only mechanism that could have recovered the earlier topic, and it makes the symptom
   unrecoverable by the user: even explicitly asking "昨天说到哪了" returns nothing, because the recalled
   records are filtered out before the prompt is built.
3. **D3 — the digest can be evicted while `context_compressed=True`** (`chat.py:683`).
   When compression is enabled, this silently leaves the model with neither the summary nor the covered raw
   history — the worst possible overnight state — and hides it behind a success flag.
4. **D4 — compression permanently unreachable under the documented low-memory profile** (`chat.py:487`, `context.py:232`).
   On the profile the project itself recommends, no summary is ever produced, so D1 always applies at 16 messages.
5. **D5 — over-long digests silently discarded** (`context.py:293-296`).
   The most verbose nights — the ones most needing a summary — are exactly the ones silently dropped.
6. **D8 / D9 / D10 / D7 / D6 / D11 / D12** — aggravating factors: history truncation, orphaned window starts,
   wrong-period recall, cross-table ordering divergence, the first-use extraction floor, blocked-head starvation,
   and unmarked one-sided recall.

**Highest-value fix targets:** D1 (round-aligned window plus an explicit continuity anchor), then D2 (make
`_time_history`'s records fingerprint-stable or carry the rewrite as a separate field), then D3 (guard the
`next(..., 1)` fallback so system messages are never popped).

---

## 6. Repro script index

All scripts live in `audit-history/` and are run from that directory with
`..\.venv\Scripts\python.exe <script>`.

| Script | Covers |
|---|---|
| `_fixture.py` | shared `Store` + `ChatService` + recording-model fixture, backdating helper |
| `q1_default_window.py` | D1, D9 (message-count vs round-count window) |
| `crit_time_history_dropped.py` | D2 (time recall discarded by `_manifest`) |
| `definitive_boundary.py` | D3 (digest eviction), D9 (orphaned window start) |
| `q3_input_budget.py` | D3 (eviction order, mid-exchange cut) |
| `q2_orphan_and_fallback.py` | D3 supporting run (its D9 probe is parity-dependent; `definitive_boundary.py` is authoritative) |
| `q4_time_history.py` | D12, D2 (explicit-time trigger behaviour) |
| `q5_compression.py` | Q5: boundary rules, digest chain, `model_failed` / `sources_changed` |
| `q5e_digest_too_long.py` | D5 (silent over-long digest) |
| `q6_memory_cursor.py` | D6 (cursor basics) |
| `q6b_cursor_scope.py` | D6 (one-time floor vs rolling window) |
| `q7_ordering.py` | D7, D11 |
| `q8_misc.py` | D8, plus system-prompt anchor and oversize-request checks |
| `final_checks.py` | D10, default-budget eviction band |
| `compression_unreachable.py` | D4 |
| `low_memory_profile.py` | D4 (documented low-memory profile) |
| `digest_eviction_band.py` | D3 severity band |
| `dbg_reason.py` | diagnostic for the `summary_exceeds_output_limit` discovery |

---

## 7. Verification status

- Required suite: `..\.venv\Scripts\python.exe -m pytest -q tests/test_context_v3.py tests/test_context_chat_v3.py` → **31 passed**.
- All 15 repro scripts above re-run cleanly from `audit-history/`: **110 `[PASS]` / 0 `[FAIL]`, every exit code 0.**
- Repo integrity: `git status --porcelain` is empty and `git rev-parse HEAD` is still `02d19ed9e8bb9e096432b3d57bc89de62af871f1`. No repo file was created, edited, or committed; all databases live under `audit-history/tmp/`.
- Every finding in §2 is backed by a script in §6 that exercises the real `Store` / `ChatService` / `ContextEngine` / `MemoryLifecycle` paths rather than reading code alone. Findings I could not reproduce are listed explicitly in §3.
