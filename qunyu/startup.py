"""Small local launcher operations; never create settings just to stop an app."""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import threading
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import urllib.error
import urllib.request
from pathlib import Path


def instance_mutex_name(data_dir: Path) -> str:
    # Keep the old name so upgrading 0.8 never starts two writers.
    return 'Local\\Qunyu-' + hashlib.sha256(str(Path(data_dir).resolve()).lower().encode()).hexdigest()[:24]


@contextmanager
def data_guard(data_dir: Path):
    """Exclusive process guard, also used while copying an old data directory."""
    if os.name == 'nt':
        import ctypes
        kernel = ctypes.WinDLL('kernel32', use_last_error=True)
        kernel.CreateMutexW.restype = ctypes.c_void_p
        kernel.CreateMutexW.argtypes = [ctypes.c_void_p, ctypes.c_bool, ctypes.c_wchar_p]
        kernel.CloseHandle.argtypes = [ctypes.c_void_p]
        mutex = kernel.CreateMutexW(None, False, instance_mutex_name(data_dir))
        if not mutex:
            raise OSError('无法建立数据进程锁')
        duplicate = ctypes.get_last_error() == 183
        try:
            if duplicate:
                raise OSError('已有 mikubot 实例正在使用此数据目录，请先退出旧版。')
            yield
        finally:
            kernel.CloseHandle(mutex)
    else:
        import fcntl
        with (Path(data_dir) / '.process.lock').open('a') as lock:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                raise OSError('已有 mikubot 实例正在使用此数据目录。') from None
            try:
                yield
            finally:
                fcntl.flock(lock, fcntl.LOCK_UN)


class ActivationServer:
    """Private loopback IPC for showing an existing native window."""
    def __init__(self, callback):
        self.secret = secrets.token_urlsafe(32)
        outer = self
        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *_):
                pass

            def do_POST(self):
                supplied = self.headers.get('Authorization', '')
                valid = (self.path == '/show' and not self.headers.get('Origin')
                         and self.headers.get('Host') == f'127.0.0.1:{self.server.server_port}'
                         and self.headers.get('Content-Length', '0') in ('0', '2')
                         and hmac.compare_digest(supplied, 'Bearer ' + outer.secret))
                if not valid:
                    self.send_error(403)
                    return
                if self.headers.get('Content-Length') == '2':
                    self.rfile.read(2)
                threading.Thread(target=callback, daemon=True).start()
                raw = b'{"ok":true}'
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(raw)))
                self.end_headers()
                self.wfile.write(raw)
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    @property
    def record(self):
        return {'port': self.server.server_port, 'secret': self.secret}

    def close(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def instance_details(data_dir: Path, *, timeout: float = 1.5):
    """Return an authenticated local instance, or None for stale/unrelated files."""
    data = Path(data_dir)
    try:
        token = (data / 'admin.token').read_text('utf-8').strip()
        if len(token) < 32 or len(token) > 512:
            return None
        record = json.loads((data / 'server.json').read_text('utf-8'))
        port = record.get('port')
        if type(port) is not int or not 1 <= port <= 65535:
            return None
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), _NoRedirect())
        url = f'http://127.0.0.1:{port}'
        with opener.open(url + '/healthz', timeout=timeout) as response:
            raw = response.read(16385)
            if len(raw) > 16384:
                return None
            info = json.loads(raw)
        identity = hashlib.sha256(token.encode()).hexdigest()[:16]
        if not isinstance(info, dict) or info.get('identity') != identity:
            return None
        activation = record.get('activation')
        # A visible shell can attach to a deliberately headless server without
        # starting a second backend. Its own loopback activation takes priority.
        try:
            shell = json.loads((data / 'desktop.json').read_text('utf-8'))
            if shell.get('service_pid') == record.get('pid') and shell.get('service_port') == port:
                activation = shell.get('activation')
        except (OSError, ValueError, TypeError, AttributeError):
            pass
        return {'url': url, 'token': token, 'port': port, 'opener': opener,
                'pid': record.get('pid'), 'mode': record.get('mode'), 'activation': activation}
    except (OSError, ValueError, TypeError, AttributeError, urllib.error.URLError):
        return None


def wake_instance(instance, *, timeout: float = 2.0) -> bool:
    activation = instance.get('activation')
    if not isinstance(activation, dict):
        return False
    port, secret = activation.get('port'), activation.get('secret')
    if type(port) is not int or not 1 <= port <= 65535 or not isinstance(secret, str) or not 32 <= len(secret) <= 128:
        return False
    request = urllib.request.Request(f'http://127.0.0.1:{port}/show', b'{}',
        headers={'Authorization': 'Bearer ' + secret, 'Content-Type': 'application/json'}, method='POST')
    try:
        with instance['opener'].open(request, timeout=timeout) as response:
            return json.loads(response.read(1024)).get('ok') is True
    except (OSError, ValueError, TypeError, AttributeError, urllib.error.URLError):
        return False


def stop_instance(data_dir: Path, *, timeout: float = 3.0) -> bool:
    instance = instance_details(data_dir, timeout=timeout)
    if not instance:
        return False
    request = urllib.request.Request(instance['url'] + '/api/shutdown', b'{}',
        headers={'Authorization': 'Bearer ' + instance['token'], 'Content-Type': 'application/json'}, method='POST')
    with instance['opener'].open(request, timeout=timeout) as response:
        result = json.loads(response.read(16384))
    if not isinstance(result, dict) or not result.get('ok'):
        raise OSError('程序未确认退出请求，请在管理台或托盘中退出')
    return True
