"""Bounded OpenAI-compatible SSE assembly; partial tools are never executed."""
from __future__ import annotations

import asyncio
import codecs
import json
import time
from contextlib import asynccontextmanager

import anyio
import httpx

MAX_RESPONSE_BYTES = 4 * 1024 * 1024
MAX_LINE_BYTES = 256 * 1024


class ModelStreamError(ValueError):
    pass


@asynccontextmanager
async def _response_stream(client, url, payload, headers):
    context = client.stream('POST', url, json=payload, headers=headers)
    response = await context.__aenter__()
    try:
        yield response
    finally:
        # Browser cancellation may inherit an AnyIO cancellation scope. Close
        # the accepted upstream socket before that scope aborts cleanup I/O.
        with anyio.CancelScope(shield=True):
            await context.__aexit__(None, None, None)


async def receive_chat(client, url, payload, headers, *, first_token_seconds=90, check=None, on_event=None):
    try:
        async with asyncio.timeout(first_token_seconds) as first_watch:
            return await _receive_chat(client, url, payload, headers, first_token_seconds=first_token_seconds,
                                       check=check, first_watch=first_watch, on_event=on_event)
    except TimeoutError as exc:
        raise httpx.ReadTimeout('模型首个有效内容等待超时') from exc


async def _receive_chat(client, url, payload, headers, *, first_token_seconds, check, first_watch, on_event):
    started, first_token_ms = time.monotonic(), None
    async with _response_stream(client, url, payload, headers) as response:
        if response.status_code != 200 or 'text/event-stream' not in response.headers.get('content-type', '').lower():
            chunks, size = [], 0
            async for chunk in response.aiter_bytes():
                size += len(chunk)
                if size > MAX_RESPONSE_BYTES:
                    raise ModelStreamError('模型响应超过安全接收上限')
                chunks.append(chunk)
            return httpx.Response(response.status_code, headers=response.headers, content=b''.join(chunks), request=response.request), None

        content, calls, usage = [], {}, {}
        finished, done, size, events, preview_blocked = False, False, 0, 0, False
        decoder, buffer, data_lines = codecs.getincrementaldecoder('utf-8-sig')('strict'), '', []

        def event():
            nonlocal finished, done, usage, first_token_ms, events, preview_blocked
            if not data_lines:
                return
            value = '\n'.join(data_lines)
            data_lines.clear()
            events += 1
            if events > 20000:
                raise ModelStreamError('模型流事件超过安全上限')
            if value.strip() == '[DONE]':
                done = True
                return
            try:
                item = json.loads(value)
                if not isinstance(item, dict) or item.get('error'):
                    raise ValueError()
                if item.get('usage') is not None:
                    if not isinstance(item['usage'], dict):
                        raise ValueError()
                    usage = item['usage']
                preview_text, saw_tools = [], False
                for choice in item.get('choices', []):
                    if choice.get('index', 0) != 0:
                        continue
                    delta = choice.get('delta') or {}
                    if not isinstance(delta, dict):
                        raise ValueError()
                    text = delta.get('content')
                    meaningful = False
                    if text is not None:
                        if not isinstance(text, str):
                            raise ValueError()
                        content.append(text)
                        preview_text.append(text)
                        meaningful = bool(text)
                    for part in delta.get('tool_calls') or []:
                        saw_tools = True
                        index = part.get('index')
                        if type(index) is not int or not 0 <= index < 64:
                            raise ValueError()
                        target = calls.setdefault(index, {'id': '', 'type': 'function', 'function': {'name': '', 'arguments': ''}})
                        identifier = part.get('id')
                        if identifier:
                            if not isinstance(identifier, str):
                                raise ValueError()
                            if identifier != target['id']:
                                target['id'] += identifier
                        if part.get('type', 'function') != 'function':
                            raise ValueError()
                        function = part.get('function') or {}
                        for key in ('name', 'arguments'):
                            fragment = function.get(key, '')
                            if not isinstance(fragment, str):
                                raise ValueError()
                            target['function'][key] += fragment
                            meaningful = meaningful or bool(fragment)
                    if meaningful and first_token_ms is None:
                        first_token_ms = round((time.monotonic() - started) * 1000)
                        first_watch.reschedule(None)
                    if choice.get('finish_reason') is not None:
                        finished = True
                if on_event:
                    if check:
                        check()
                    if saw_tools and not preview_blocked:
                        preview_blocked = True
                        on_event('reset', '')
                    elif not preview_blocked and preview_text:
                        # Only content is public. reasoning_content and tool
                        # argument fragments never enter this channel.
                        on_event('delta', ''.join(preview_text))
            except (ValueError, TypeError, KeyError, AttributeError) as exc:
                raise ModelStreamError('模型流返回无效事件，未使用不完整结果') from exc

        def line(value):
            if not value:
                event()
            elif value.startswith('data:'):
                data_lines.append(value[5:].lstrip(' '))

        iterator = response.aiter_bytes().__aiter__()
        try:
            while not done:
                if check:
                    check()
                remaining = first_token_seconds - (time.monotonic() - started)
                if first_token_ms is None and remaining <= 0:
                    raise httpx.ReadTimeout('模型首个有效内容等待超时', request=response.request)
                try:
                    chunk = await asyncio.wait_for(iterator.__anext__(), remaining) if first_token_ms is None else await iterator.__anext__()
                except StopAsyncIteration:
                    break
                except TimeoutError as exc:
                    raise httpx.ReadTimeout('模型首个有效内容等待超时', request=response.request) from exc
                size += len(chunk)
                if size > MAX_RESPONSE_BYTES:
                    raise ModelStreamError('模型响应超过安全接收上限')
                buffer += decoder.decode(chunk)
                while '\n' in buffer:
                    value, buffer = buffer.split('\n', 1)
                    if len(value.encode('utf-8')) > MAX_LINE_BYTES:
                        raise ModelStreamError('模型流单行超过安全上限')
                    line(value.rstrip('\r'))
                if len(buffer.encode('utf-8')) > MAX_LINE_BYTES:
                    raise ModelStreamError('模型流单行超过安全上限')
            buffer += decoder.decode(b'', final=True)
            if buffer:
                line(buffer.rstrip('\r'))
            event()
        except UnicodeError as exc:
            raise ModelStreamError('模型流包含无效编码') from exc
        if check:
            check()
        if not finished or not (content or calls):
            raise ModelStreamError('模型流在完整回复结束前中断，未执行工具')
        for call in calls.values():
            if not call['id'] or not call['function']['name']:
                raise ModelStreamError('模型工具调用缺少完整标识')
            try:
                arguments = json.loads(call['function']['arguments'])
                if not isinstance(arguments, dict):
                    raise ValueError()
            except ValueError as exc:
                raise ModelStreamError('模型工具参数不完整，未执行工具') from exc
        message = {'role': 'assistant', 'content': ''.join(content)}
        if calls:
            message['tool_calls'] = [calls[key] for key in sorted(calls)]
        result = {'choices': [{'message': message}], 'usage': usage}
        return httpx.Response(200, json=result, request=response.request), first_token_ms
