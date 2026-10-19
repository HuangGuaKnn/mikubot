"""Explicit live acceptance against an already running WebUI; no QQ sends or configuration writes.

The user sends test messages during the observation window. Only diagnostic
codes and counters are written, never account IDs, chat text, model output,
URLs, passwords or cookies. --test-model explicitly allows one billed probe.
"""
import argparse
from datetime import datetime,timezone
import getpass
import ipaddress
import json
from pathlib import Path
import sys
import time
from urllib.parse import urlsplit

import httpx


def safe_status(value):
    codes={'sent','accepted','planner_skip','passive_only','quiet','cooldown','interrupted','reply_failed',
           'reply_empty','send_failed','private_not_allowed','group_not_allowed','ingress_busy','command',
           'connector_disabled','scope_disabled','paused','self_message','duplicate_message','planner_error',
           'invalid_scope','invalid_sender','unsupported_message','empty_message','admin_pairing'}
    last=value.get('last_message_result') or {}
    return {'connected':bool(value.get('connected')),
        'received':max(0,int(value.get('message_events_received',0))),
        'accepted':max(0,int(value.get('accepted_messages',0))),
        'code':last.get('code') if last.get('code') in codes else 'unknown'}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url',default='http://127.0.0.1:8765')
    parser.add_argument('--seconds',type=int,default=60)
    parser.add_argument('--test-model',action='store_true')
    parser.add_argument('--output',type=Path,default=Path('live-acceptance.json'))
    args=parser.parse_args()
    parsed=urlsplit(args.url)
    try:loopback=parsed.hostname=='localhost' or ipaddress.ip_address(parsed.hostname or '').is_loopback
    except ValueError:loopback=False
    if (parsed.scheme not in ('http','https') or not parsed.hostname or parsed.username or parsed.password
            or parsed.path.strip('/') or parsed.query or parsed.fragment or (parsed.scheme=='http' and not loopback)):
        parser.error('使用本机HTTP入口或证书有效的HTTPS入口；不要在URL里放密码')
    if not 1<=args.seconds<=3600:parser.error('观察时长须为1—3600秒')
    report={'at':datetime.now(timezone.utc).isoformat(),'qq_receipt_observed':False,'model_probe':'not_requested'}
    try:
        with httpx.Client(base_url=args.url.rstrip('/'),timeout=90,trust_env=False) as client:
            response=client.post('/api/auth/login',json={'password':getpass.getpass('WebUI管理密码：')})
            response.raise_for_status()
            def status():
                response=client.get('/api/qq/status');response.raise_for_status()
                return safe_status(response.json())
            initial=status();report['initial']=initial
            response=client.post('/api/qq/self-test',json={});response.raise_for_status()
            report['checks']=[{k:item[k] for k in ('id','status')} for item in response.json()['checks']]
            if args.test_model:
                response=client.post('/api/model/test',json={});response.raise_for_status()
                report['model_probe']='passed' if response.json().get('ok') else 'failed'
            print('请现在从允许的QQ账号发一条测试消息；可在观察期间手动断开并恢复连接器以检查重连。')
            deadline=time.monotonic()+args.seconds;codes=set();disconnect=False;reconnected=False
            while time.monotonic()<deadline:
                current=status();codes.add(current['code'])
                if not current['connected']:disconnect=True
                elif disconnect:reconnected=True
                if current['received']>initial['received'] and current['code']=='sent':report['qq_receipt_observed']=True
                time.sleep(min(1,max(0,deadline-time.monotonic())))
            report.update(final=status(),observed_codes=sorted(codes),disconnect_observed=disconnect,reconnect_observed=reconnected)
    except (httpx.HTTPError,ValueError,KeyError,OSError,EOFError) as exc:
        report.update(error_type=type(exc).__name__,status='failed')
    else:report['status']='passed' if report['qq_receipt_observed'] else 'inconclusive'
    args.output.write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf-8')
    print('验收报告已保存；仅观察到平台发送回执才能标记收发通过。')
    return 0 if report['status']=='passed' else 1


if __name__=='__main__':raise SystemExit(main())
