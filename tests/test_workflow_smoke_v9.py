"""Validate the external EXE smoke fixture's protocol without starting an app."""
import importlib.util
import json
from pathlib import Path

import pytest

spec = importlib.util.spec_from_file_location('smoke_workflow_v9', Path(__file__).resolve().parents[1] / 'scripts/smoke_workflow_v9.py')
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)


def body(names, *, marker, tool_results=()):
    return {'model': 'workflow-beta', 'tools': [{'type': 'function', 'function': {'name': name}} for name in names],
        'messages': [{'role': 'system', 'content': 'fixture'}, {'role': 'user', 'content': '请运行本机脚本 ' + marker},
                     *[{'role': 'tool', 'tool_call_id': str(i), 'content': json.dumps(value)} for i, value in enumerate(tool_results)]]}


def test_chat_can_start_only_explicit_marked_task_and_never_repeats_it():
    ordinary = body(['start_computer_task'], marker=smoke.NORMAL_MARKER)
    assert smoke.fixture_reply(ordinary)[1] == 'chat'
    start = body(['start_computer_task'], marker=smoke.COMPUTER_MARKER)
    response, phase = smoke.fixture_reply(start)
    assert phase == 'start_computer_task'
    assert response['tool_calls'][0]['function']['name'] == 'start_computer_task'
    assert smoke.COMPUTER_MARKER in json.loads(response['tool_calls'][0]['function']['arguments'])['request']
    continued = body(['start_computer_task'], marker=smoke.COMPUTER_MARKER, tool_results=[{'job_id': 'only-one'}])
    response, phase = smoke.fixture_reply(continued)
    assert phase == 'task_submitted' and not response.get('tool_calls')


def test_computer_fixture_depends_on_real_success_receipts_in_order():
    names = ['write_file', 'execute_python']
    first, phase = smoke.fixture_reply(body(names, marker=smoke.COMPUTER_MARKER))
    assert phase == 'computer_write'
    args = json.loads(first['tool_calls'][0]['function']['arguments'])
    assert args == {'path': 'workflow-note.txt', 'content': smoke.WRITE_TEXT}
    second, phase = smoke.fixture_reply(body(names, marker=smoke.COMPUTER_MARKER, tool_results=[{'ok': True}]))
    assert phase == 'computer_python'
    assert second['tool_calls'][0]['function']['name'] == 'execute_python'
    code = json.loads(second['tool_calls'][0]['function']['arguments'])['code']
    compile(code, '<isolated-fixture>', 'exec')
    assert 'workflow-python.txt' in code and smoke.PYTHON_TEXT in code and smoke.PYTHON_OUTPUT in code
    _, phase = smoke.fixture_reply(body(names, marker=smoke.COMPUTER_MARKER, tool_results=[{'ok': True}, {'ok': True}]))
    assert phase == 'computer_completed'
    _, phase = smoke.fixture_reply(body(names, marker=smoke.COMPUTER_MARKER, tool_results=[{'ok': False, 'error': 'fixture failure'}]))
    assert phase == 'computer_failed'


def test_stop_fixture_blocks_before_forbidden_file_and_can_check_own_pid():
    response, phase = smoke.fixture_reply(body(['write_file', 'execute_python'], marker=smoke.STOP_MARKER))
    assert phase == 'computer_stop'
    code = json.loads(response['tool_calls'][0]['function']['arguments'])['code']
    compile(code, '<isolated-stop-fixture>', 'exec')
    assert code.index('workflow-stop-pid.txt') < code.index('time.sleep(20)') < code.index('workflow-stop-forbidden.txt')
    import os
    assert smoke.process_active(os.getpid())


def test_local_http_fixture_auth_discovery_chat_and_protocol_do_not_retain_keys():
    with smoke.local_model_fixture() as (url, protocol):
        client = smoke.Client(url)
        assert client.request('/models', expected=401) == {'error': 'fixture authorization mismatch'}
        headers = {'Authorization': 'Bearer ' + smoke.SOURCE_KEY}
        listed = client.request('/models', headers=headers)
        assert [item['id'] for item in listed['data']] == smoke.MODEL_NAMES
        response = client.request('/chat/completions', body(['start_computer_task'], marker=smoke.COMPUTER_MARKER), headers=headers)
        assert response['choices'][0]['message']['tool_calls'][0]['function']['name'] == 'start_computer_task'
        assert response['usage']['completion_tokens'] > 0
        assert protocol[0]['phase'] == 'models' and protocol[1]['phase'] == 'start_computer_task'
        assert all(item['authorization_matched'] for item in protocol)
        assert smoke.SOURCE_KEY not in json.dumps(protocol)


def test_job_poll_fails_if_automatic_mode_ever_requires_approval():
    client = type('Client', (), {'request': lambda self, path: {'status': 'awaiting_approval', 'events': []}})()
    with pytest.raises(AssertionError, match='approval'):
        smoke.wait_job(client, 'isolated', {'completed'})
