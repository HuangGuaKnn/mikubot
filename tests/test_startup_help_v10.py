from types import SimpleNamespace

import pytest

import qunyu.__main__ as launcher


@pytest.mark.parametrize('choice,expected', [(6, True), (7, False)])
def test_desktop_failure_offers_explicit_browser_choice(tmp_path, monkeypatch, choice, expected):
    shown = []
    monkeypatch.setattr(launcher, 'os', SimpleNamespace(name='nt'))
    monkeypatch.setattr(launcher.ctypes, 'windll', SimpleNamespace(user32=SimpleNamespace(
        MessageBoxW=lambda *args: shown.append(args) or choice)), raising=False)
    assert launcher._desktop_error(RuntimeError('WebView2 missing'), tmp_path, 8765) is expected
    assert shown[0][3] == 0x24
    assert '是否改用系统浏览器继续' in shown[0][1]
    assert '下次启动仍优先使用桌面窗口' in shown[0][1]


def prepare_main(tmp_path, monkeypatch, instances):
    events = []
    class Guard:
        def __enter__(self): events.append('lock')
        def __exit__(self, *_): events.append('unlock')
    monkeypatch.setattr(launcher.sys, 'argv', ['mikubot'])
    monkeypatch.setattr(launcher, 'application_base', lambda: tmp_path)
    monkeypatch.setattr(launcher, 'resolve_data_dir', lambda *args, **kw: tmp_path)
    monkeypatch.setattr(launcher.logging, 'basicConfig', lambda **kw: None)
    monkeypatch.setattr(launcher, 'instance_details', lambda *args, **kw: next(instances))
    monkeypatch.setattr(launcher, 'data_guard', lambda data: Guard())
    return events


def test_browser_retry_stops_old_service_and_releases_lock_first(tmp_path, monkeypatch):
    events = prepare_main(tmp_path, monkeypatch, iter([None, None]))
    modes = []
    def run(data, args, _):
        assert data == tmp_path
        modes.append(args.browser)
        events.append('browser' if args.browser else 'desktop')
        return not args.browser
    monkeypatch.setattr(launcher, '_run_instance', run)
    launcher.main()
    assert modes == [False, True]
    assert events == ['lock', 'desktop', 'unlock', 'lock', 'browser', 'unlock']


def test_browser_retry_attaches_if_another_start_won_the_race(tmp_path, monkeypatch):
    existing = {'port': 8765, 'mode': 'browser'}
    events = prepare_main(tmp_path, monkeypatch, iter([None, existing]))
    monkeypatch.setattr(launcher, '_run_instance', lambda *_: True)
    opened = []
    monkeypatch.setattr(launcher, '_show_existing', lambda instance, data, args: opened.append((instance, args.browser)))
    launcher.main()
    assert events == ['lock', 'unlock']
    assert opened == [(existing, True)]


def test_declining_fallback_never_restarts_or_opens_browser(tmp_path, monkeypatch):
    events = prepare_main(tmp_path, monkeypatch, iter([None]))
    monkeypatch.setattr(launcher, '_run_instance', lambda *_: False)
    monkeypatch.setattr(launcher.webbrowser, 'open', lambda *_: pytest.fail('Browser opened without choosing fallback'))
    launcher.main()
    assert events == ['lock', 'unlock']
