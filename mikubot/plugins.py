"""Versioned local plugins, executed by the existing computer permission boundary.

Plugin code is never imported into the server process. Saving or listing a
plugin has no execution side effects; editing always revokes its activation.
"""
from __future__ import annotations

import ast
import asyncio
import hashlib
import json
from pathlib import Path
import re
import threading

from fastapi import Body, HTTPException

from .computer import schema
from .filesystem import is_link

CREATE_TOOL = schema('create_plugin', '仅在本地管理员明确要求创建插件时保存 Python 代码，定义 run(input) 并返回可 JSON 序列化结果。默认保存停用草稿；仅已有电脑自动授权且用户明确要求创建并运行时直接启用，随后可调用 run_plugin。',
    {'id': {'type': 'string', 'minLength': 2, 'maxLength': 48},
     'name': {'type': 'string', 'minLength': 1, 'maxLength': 80},
     'description': {'type': 'string', 'minLength': 1, 'maxLength': 1000},
     'code': {'type': 'string', 'minLength': 1, 'maxLength': 10000}}, ['id', 'name', 'description', 'code'])
RUN_TOOL = schema('run_plugin', '仅在本地管理员明确要求使用插件时，运行已启用的插件。遵循电脑任务的运行环境、审批、时限与停止设置。',
    {'id': {'type': 'string', 'minLength': 2, 'maxLength': 48},
     'input': {'type': 'object'}}, ['id', 'input'])
LIST_TOOL = schema('list_plugins', '查看本地插件 ID、用途及启用状态。使用插件前先查询，不能猜测插件 ID。', {}, [])


def requested(text, *, create=False):
    text = str(text).strip()
    if not re.search(r'插件|plugin', text, re.I) or re.match(r'^(?:请)?(?:不要|不用|别)', text):
        return False
    if not re.match(r'^(?:请|麻烦|帮我|为我|替我|能否|可以帮我|能不能|我想|我希望|我需要|现在|先|再|给我|创建|编写|制作|开发|生成|运行|使用|调用|执行|create|build|run|use)', text, re.I):
        return False
    return bool(re.search(r'创建|编写|制作|开发|生成|create|build' if create else r'运行|使用|调用|执行|run|use', text, re.I))


def create_and_run(text):
    """A combined explicit request may use an existing automatic grant."""
    return bool(requested(text, create=True) and requested(text)
                and re.search(r'(?:并(?:且)?|然后|接着|再|直接)(?:帮我|为我)?(?:运行|执行|调用|使用)', str(text))
                and not re.search(r'不(?:要|用|会)?(?:运行|执行|调用|使用)', str(text)))


class PluginService:
    def __init__(self, data_dir, computer):
        self.folder = Path(data_dir) / 'plugins'
        self.computer, self.runs = computer, computer.runs
        self.lock = threading.RLock()
        self.runs.register('plugin', self.run, self.guard)

    def _path(self, plugin_id):
        if not isinstance(plugin_id, str) or not re.fullmatch(r'[a-z][a-z0-9_]{1,47}', plugin_id):
            raise ValueError('插件 ID 需为2—48位小写字母、数字或下划线，并以字母开头')
        if is_link(self.folder) or is_link(self.folder.parent):
            raise ValueError('插件目录不能是链接')
        self.folder.mkdir(parents=True, exist_ok=True)
        path = self.folder / (plugin_id + '.json')
        if is_link(path): raise ValueError('插件文件不能是链接')
        return path

    def get(self, plugin_id):
        with self.lock:
            path = self._path(plugin_id)
            if not path.exists(): raise ValueError('插件不存在')
            if path.stat().st_size > 160000: raise ValueError('插件文件过大')
            item = json.loads(path.read_text('utf-8'))
            if (not isinstance(item, dict) or item.get('id') != plugin_id or item.get('schema_version') != 1
                    or not isinstance(item.get('code'), str) or len(item['code']) > 10000
                    or self._digest(item) != item.get('sha256') or type(item.get('enabled')) is not bool
                    or type(item.get('revision')) is not int or item['revision'] < 1
                    or not all(isinstance(item.get(key), str) and item[key].strip() for key in ('name', 'description'))):
                raise ValueError('插件内容或摘要已变化，请重新保存并启用')
            return item

    @staticmethod
    def _digest(item):
        raw = json.dumps({key: item.get(key) for key in ('id', 'name', 'description', 'code')}, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(raw.encode()).hexdigest()

    def _save(self, item):
        path = self._path(item['id'])
        temp = path.with_suffix('.tmp')
        if is_link(temp): raise ValueError('插件临时文件不能是链接')
        temp.write_text(json.dumps(item, ensure_ascii=False, indent=2), 'utf-8')
        temp.replace(path)
        return item

    def list(self):
        with self.lock:
            self._path('validate')
            result = []
            for path in sorted(self.folder.glob('*.json'))[:200]:
                try:
                    item = self.get(path.stem)
                    result.append({k: v for k, v in item.items() if k != 'code'})
                except (OSError, ValueError, KeyError, TypeError):
                    result.append({'id': path.stem, 'name': path.stem, 'enabled': False, 'error': '文件损坏或摘要不符，未加载'})
            return result

    def save(self, payload):
        from .tool_actions import validate_arguments
        validate_arguments(CREATE_TOOL['function']['parameters'], payload)
        try: tree = ast.parse(payload['code'])
        except SyntaxError as exc: raise ValueError(f'Python 语法错误，第{exc.lineno}行：{exc.msg}') from exc
        if not any(isinstance(node, ast.FunctionDef) and node.name == 'run' and len(node.args.args) == 1
                   and not node.args.vararg and not node.args.kwarg and not node.args.kwonlyargs for node in tree.body):
            raise ValueError('插件需定义同步函数 run(input)，接受一个参数')
        with self.lock:
            path = self._path(payload['id'])
            old = self.get(payload['id']) if path.exists() else None
            if not old and len(list(self.folder.glob('*.json'))) >= 200: raise ValueError('插件数量已达200个上限')
            item = dict(payload, schema_version=1, revision=(old or {}).get('revision', 0) + 1, enabled=False)
            item['sha256'] = self._digest(item)
            return self._save(item)

    def activate(self, plugin_id, enabled):
        if type(enabled) is not bool: raise ValueError('启用状态无效')
        with self.lock:
            item = self.get(plugin_id)
            item.update(enabled=enabled, revision=item['revision'] + 1)
            return self._save(item)

    def delete(self, plugin_id):
        with self.lock:
            self._path(plugin_id).unlink()

    def allowed(self, identity, scope_id):
        return (isinstance(identity, dict) and identity.get('platform') == 'local'
                and str(scope_id).startswith('web:') and self.computer.allowed(identity, scope_id))

    def submit(self, plugin_id, arguments, scope_id, user_id, identity, *, source_ids=None):
        if not self.allowed(identity, scope_id): raise PermissionError('插件只能由已开启电脑能力的本地聊天管理员运行')
        if not isinstance(arguments, dict) or len(json.dumps(arguments, ensure_ascii=False)) > 12000:
            raise ValueError('插件输入需为12000字以内的 JSON 对象')
        with self.lock:
            item = self.get(plugin_id)
            if not item['enabled']: raise ValueError('插件尚未启用，请先在插件页核对代码后启用')
            permissions = dict(self.computer.settings.get()['computer'])
            job = self.runs.submit('plugin', {'id': plugin_id, 'input': arguments, 'revision': item['revision'],
                'sha256': item['sha256'], 'source_ids': source_ids or [], 'permissions': permissions},
                identity=identity, scope_id=scope_id, user_id=user_id, title='插件：' + item['name'])
            return job

    def guard(self, job):
        try:
            payload = job['_payload']
            item = self.get(payload['id'])
            return (self.allowed(job['identity'], job['scope_id']) and self.computer.guard(job)
                    and item['enabled'] and item['revision'] == payload['revision'] and item['sha256'] == payload['sha256']
                    and payload['permissions'] == self.computer.settings.get()['computer'])
        except (OSError, ValueError, KeyError, TypeError): return False

    async def run(self, ctx, payload):
        async with self.computer._slot:
            ctx.check()
            item = self.get(payload['id'])
            root = self.computer.path(self.computer.workspace(), 'plugins/' + item['id'])
            root.mkdir(parents=True, exist_ok=True)
            # JSON strings are encoded as Python literals, never interpolated as
            # source fragments. All code runs only in the computer child worker.
            code = ('import json\n_namespace = {}\nexec(compile(' + repr(item['code']) + ", '<plugin>', 'exec'), _namespace)\n"
                    + '_result = _namespace["run"](json.loads(' + repr(json.dumps(payload['input'], ensure_ascii=False)) + '))\n'
                    + 'print(json.dumps(_result, ensure_ascii=False, allow_nan=False))\n')
            ctx.progress(stage='executing', message='正在运行插件：' + item['name'])
            output = await self.computer.execute(ctx, root, 'execute_python', {'code': code})
            ctx.check()
            if not output['ok']: raise ValueError('插件执行失败，请查看任务日志：' + output.get('output', '')[-3000:])
            return {'reply': output.get('output', '').strip() or '插件执行完成，无文本输出。', 'execution': output, 'plugin_id': item['id']}


def install_plugins(app, data_dir, chat):
    service = PluginService(data_dir, app.state.computer)
    app.state.plugins = chat.plugins = service

    def admin():
        if not app.state.access.is_admin(app.state.access.identity('local', 'mikubot')):
            raise HTTPException(403, '当前本地账号没有管理员权限')

    @app.get('/api/plugins')
    async def listing():
        admin()
        return {'items': await asyncio.to_thread(service.list), 'runtime': service.computer.settings.get()['computer']}

    @app.get('/api/plugins/{plugin_id}')
    async def detail(plugin_id: str):
        admin()
        return await asyncio.to_thread(service.get, plugin_id)

    @app.post('/api/plugins')
    async def save(payload: dict = Body(...)):
        admin()
        return await asyncio.to_thread(service.save, payload)

    @app.put('/api/plugins/{plugin_id}/enabled')
    async def enabled(plugin_id: str, payload: dict = Body(...)):
        admin()
        return await asyncio.to_thread(service.activate, plugin_id, payload.get('enabled'))

    @app.delete('/api/plugins/{plugin_id}')
    async def delete(plugin_id: str):
        admin()
        await asyncio.to_thread(service.delete, plugin_id)
        return {'ok': True}

    @app.post('/api/plugins/{plugin_id}/run')
    async def run(plugin_id: str, payload: dict = Body(...)):
        admin()
        scope_id = payload.get('scope_id', 'web:default')
        return service.submit(plugin_id, payload.get('input', {}), scope_id, 'mikubot', app.state.access.identity('local', 'mikubot'))
