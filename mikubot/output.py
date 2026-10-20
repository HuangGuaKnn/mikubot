"""Model-authored message boundaries, plus bounded transport protection."""
from __future__ import annotations

import re
import json
import unicodedata


DEFAULT_OUTPUT = {'enabled': True, 'mode': 'model', 'target_chars': 160, 'max_chars': 320,
                  'interval_ms': 600, 'max_parts': 8, 'platform_max_chars': 1800}
_PROTECTED_TEXT = r'(?P<fence>`{3,}|~{3,})[\s\S]*?(?:(?P=fence)|$)|`[^`\n]+`|\[[^\]\n]*\]\([^\s)]*\)|https?://[^\s<>]+'


class OutputLimitError(ValueError):
    """A protected atom cannot be delivered intact under the local transport cap."""


def strip_memory_citations(text, memory_ids, *, user_text=''):
    """Remove only known internal citation markers, before storage/pacing.

    Never guess that an arbitrary hex string is an internal ID. Literal user
    examples, code, links and URLs are preserved.
    """
    tokens = set()
    for key in memory_ids:
        if isinstance(key, str) and len(key) >= 8:
            tokens.update((key.casefold(), key[:8].casefold()))
    if not tokens: return text
    protected = re.compile(_PROTECTED_TEXT)
    citation = re.compile(r'\[([^\[\]\n]{1,400})\]|【([^【】\n]{1,400})】')
    def remove(match):
        marker = match.group()
        if marker in user_text: return marker
        body = match.group(1) or match.group(2)
        body = re.sub(r'^(?:记忆|来源|memory)(?:\s*ID)?\s*[:：]?\s*', '', body, flags=re.I)
        parts = re.split(r'[,，;；、\s]+', body.strip())
        return '' if parts and all(part.casefold() in tokens for part in parts) else marker
    result, position = [], 0
    for match in protected.finditer(text):
        result.extend((citation.sub(remove, text[position:match.start()]), match.group()))
        position = match.end()
    result.append(citation.sub(remove, text[position:]))
    return ''.join(result)


def transport_limit(config, scope=None):
    scope_id = str((scope or {}).get('id', ''))
    section = 'qq_official' if scope_id.startswith('qqofficial:') else 'onebot'
    override = (config.get(section) or {}).get('max_message_chars', 0)
    return max(40, min(20000, int(override or (config.get('output') or {}).get('platform_max_chars', 1800))))


def output_config(config, scope=None):
    result = dict(DEFAULT_OUTPUT, **(config.get('output') or {}))
    scope = scope or {}
    local = scope.get('output') or (scope.get('settings') or {}).get('output') or {}
    result.update({key: value for key, value in local.items() if key in result and value is not None})
    for key in DEFAULT_OUTPUT:
        value = scope.get('output_' + key, (scope.get('settings') or {}).get('output_' + key))
        if value is not None:
            result[key] = value
    if result['mode'] not in ('model', 'length'):
        raise ValueError('输出分段模式无效')
    result['target_chars'] = max(20, min(2000, int(result['target_chars'])))
    result['max_chars'] = max(result['target_chars'], min(4000, int(result['max_chars'])))
    result['max_parts'] = max(1, min(30, int(result['max_parts'])))
    result['interval_ms'] = max(0, min(5000, int(result['interval_ms'])))
    result['platform_max_chars'] = transport_limit(config, scope)
    return result


def _atoms(text):
    # Markdown links, fenced and inline code, and bare URLs are indivisible.
    protected = re.compile(_PROTECTED_TEXT)
    position = 0
    for match in protected.finditer(text):
        yield from _graphemes(text[position:match.start()])
        yield match.group()
        position = match.end()
    yield from _graphemes(text[position:])


def _graphemes(text):
    cluster = ''
    regional = 0
    for char in text:
        code = ord(char)
        attached = (unicodedata.combining(char) != 0 or char == '\u200d' or cluster.endswith('\u200d')
                    or 0xFE00 <= code <= 0xFE0F or 0x1F3FB <= code <= 0x1F3FF
                    or 0xE0100 <= code <= 0xE01EF)
        flag = 0x1F1E6 <= code <= 0x1F1FF
        if cluster and not attached and not (flag and regional == 1):
            yield cluster
            cluster = ''
            regional = 0
        cluster += char
        regional = regional + 1 if flag else 0
    if cluster:
        yield cluster


def generation_instructions(config, scope=None):
    options = output_config(config, scope)
    if not options['enabled']:
        return '\n消息格式：本次只发送一条完整消息，不主动拆成多条。可保留必要的列表、代码和文档排版。'
    if options['mode'] == 'length': return ''
    return ('\n【消息发送格式】在生成回复时自行决定每条独立消息的边界。需要另发一条时，使用一个空行（两个换行）分隔；'
            '单个换行只是同一条消息内的排版。可以只回复几个字、一句话，也可以在一条里说好几句；不要固定段数，不要为凑长度拆开一句话。'
            f'本次最多建议{options["max_parts"]}条，能一条说清就只发一条。'
            '不要为了分段添加序号、JSON包装、特殊分隔符或解释文字。完整代码用代码围栏包住，代码内空行不是消息边界；链接保持完整。'
            '用户要求可直接复制的JSON、表格、完整文档或原文时，保持其完整格式放在一条中，不为聊天节奏打断。')


def model_reply_parts(text, config=None, scope=None):
    """Read only authored blank-line boundaries; never infer stops from length.

    Whitespace-only messages are ignored. Code, links and inline code are
    opaque, and a complete JSON value remains one copyable message. A flood of
    authored paragraphs is folded into the final allowed message without loss.
    """
    text = str(text)
    options = output_config(config or {}, scope)
    if not text.strip(): return []
    if not options['enabled']: return [text]
    if options['mode'] == 'length': return _length_parts(text, options)
    if text.lstrip().startswith(('{', '[')):
        try:
            if isinstance(json.loads(text), (dict, list)): return [text.strip()]
        except (ValueError, RecursionError): pass
    pattern = re.compile(rf'(?P<protected>{_PROTECTED_TEXT})|(?P<boundary>(?:\r?\n[ \t]*){{2,}})')
    parts, start = [], 0
    for match in pattern.finditer(text):
        if match.lastgroup != 'boundary': continue
        part = text[start:match.start()].strip()
        if part: parts.append(part)
        start = match.end()
    tail = text[start:].strip()
    if tail: parts.append(tail)
    maximum = options['max_parts']
    if len(parts) > maximum:
        parts[maximum-1:] = ['\n\n'.join(parts[maximum-1:])]
    return parts


def split_output(text, config=None, scope=None):
    """Preserve model choices; split further only at the actual transport cap."""
    options = output_config(config or {}, scope)
    return [chunk for part in model_reply_parts(text, config, scope)
            for chunk in _hard_parts(part, options['platform_max_chars']) if chunk.strip()]


def _length_parts(text, options):
    """Prefer natural stops near target length, with no fixed number of sentences.

    An oversized protected atom or the final max-parts tail may exceed max_chars.
    Preserving code/links and complete content takes precedence over the soft cap.
    """
    text = str(text)
    if not text:
        return []
    if not options['enabled'] or len(text) <= options['target_chars']:
        return [text] if text.strip() else []
    atoms = list(_atoms(text))
    parts = []
    while atoms and len(parts) < options['max_parts'] - 1:
        total, boundary = 0, 0
        strong, weak = [], []
        for index, atom in enumerate(atoms):
            if total + len(atom) > options['max_chars'] and index:
                break
            total += len(atom)
            boundary = index + 1
            end = atom[-1:]
            if end in '\n。！？!?；;':
                strong.append((boundary, total))
            elif end in '，, ':
                weak.append((boundary, total))
            elif end == '.' and (index + 1 == len(atoms) or atoms[index + 1].isspace()):
                strong.append((boundary, total))
        if boundary == len(atoms):
            if total <= options['target_chars']:
                break
        candidates = strong or [pair for pair in weak if pair[1] >= options['target_chars'] // 2]
        if candidates:
            cut = min(candidates, key=lambda pair: abs(pair[1] - options['target_chars']))[0]
        else:
            # A target length is not a reason to cut a sentence in half. Keep
            # it whole up to the transport limit; only that hard cap must win.
            cut, size = 0, 0
            for atom in atoms:
                if size + len(atom) > options['platform_max_chars'] and cut:
                    break
                size += len(atom)
                cut += 1
                if atom[-1:] in '\n。！？!?；;' and size >= options['target_chars']:
                    break
        # Closing quotation marks belong to the sentence they close, including
        # long sentences allowed to exceed the preferred length.
        while cut < len(atoms) and atoms[cut] in '”’」』）)]':
            cut += 1
        # Scan a whitespace prefix once instead of repeatedly joining a growing
        # prefix when a provider emits thousands of empty lines.
        if not ''.join(atoms[:cut]).strip():
            while cut < len(atoms) and not atoms[cut].strip():
                cut += 1
            if cut < len(atoms):
                cut += 1
        parts.append(''.join(atoms[:cut]))
        atoms = atoms[cut:]
    if atoms:
        tail = ''.join(atoms)
        if parts and not tail.strip():
            parts[-1] += tail
        else:
            parts.append(tail)
    return [part for part in parts if part.strip()]


def _hard_parts(text, limit):
    """The transport cap wins over max_parts; no truncation or broken URLs/code."""
    parts, current = [], ''
    for atom in _atoms(text):
        if len(atom) > limit:
            raise OutputLimitError('完整链接、代码或字符超过当前发送长度上限；原文已保留在本地对话记录。')
        if current and len(current) + len(atom) > limit:
            parts.append(current)
            current = ''
        current += atom
    if current:
        if parts and not current.strip() and len(parts[-1]) + len(current) <= limit:
            parts[-1] += current
        else:
            parts.append(current)
    return parts


def split_transport_output(text, config, scope=None):
    """Adapters enforce only their hard cap; conversational pacing belongs to Flow."""
    return [part.strip() for part in _hard_parts(str(text), transport_limit(config, scope)) if part.strip()]
