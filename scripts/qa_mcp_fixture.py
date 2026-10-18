"""Local-only protocol fixture for manual QA; never bundled with the app."""
import argparse
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

SCHEMA = {'type':'object','properties':{'text':{'type':'string','maxLength':1000}},'required':['text'],'additionalProperties':False}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--data-dir',type=Path,required=True)
    parser.add_argument('--port',type=int,default=18790)
    args=parser.parse_args()
    args.data_dir.mkdir(parents=True,exist_ok=True)
    class Handler(BaseHTTPRequestHandler):
        def log_message(self,*values): pass
        def send(self,payload=None,status=200):
            raw=json.dumps(payload,ensure_ascii=False).encode() if payload is not None else b''
            self.send_response(status)
            self.send_header('Content-Type','application/json')
            self.send_header('Content-Length',str(len(raw)))
            self.send_header('Mcp-Session-Id','qa-session')
            self.end_headers()
            self.wfile.write(raw)
        def do_DELETE(self): self.send(None,204)
        def do_POST(self):
            if self.path=='/__qa_shutdown':
                self.send({'ok':True})
                threading.Thread(target=self.server.shutdown,daemon=True).start()
                return
            size=int(self.headers.get('Content-Length','0'))
            if size>100000: return self.send({},413)
            body=json.loads(self.rfile.read(size))
            if self.path=='/v1/chat/completions':
                names=[x['function']['name'] for x in body.get('tools',[]) if x['function']['name'].startswith('mcp_')]
                has_result=any(x['role']=='tool' for x in body.get('messages',[]))
                message={'role':'assistant','content':'这是本地验收替身答复，不代表真实模型质量。'}
                if any('你是聊天参与规划器' in str(x.get('content','')) for x in body.get('messages',[])):
                    plan_input=json.loads(body['messages'][-1]['content'])
                    message={'role':'assistant','content':json.dumps({'action':'reply', 'target_message_id':plan_input['current_message_id'],
                        'target_user_id':plan_input['current_user_id'], 'addressed_to_bot':True, 'intent':'回应当前本地验收请求',
                        'reason':'本地协议替身固定计划，仅供验收', 'needed_info':[]},ensure_ascii=False)}
                elif names and not has_result:
                    message={'role':'assistant','content':'','tool_calls':[{'id':'qa-call-1','type':'function','function':{'name':names[0],'arguments':json.dumps({'text':'本地MCP审批验收便笺'},ensure_ascii=False)}}]}
                return self.send({'choices':[{'message':message}],'usage':{'prompt_tokens':30,'completion_tokens':10}})
            method=body.get('method')
            if method=='notifications/initialized': return self.send(None,202)
            result={}
            if method=='initialize': result={'protocolVersion':'2025-11-25','capabilities':{'tools':{}},'serverInfo':{'name':'Local QA Fixture','version':'1.0'}}
            elif method=='tools/list': result={'tools':[{'name':'append_note','description':'追加一条本地验收便笺','inputSchema':SCHEMA}]}
            elif method=='tools/call':
                text=body['params']['arguments']['text']
                with (args.data_dir/'notes.txt').open('a',encoding='utf-8') as handle: handle.write(text+'\n')
                result={'content':[{'type':'text','text':'已追加一条本地验收便笺'}],'isError':False}
            self.send({'jsonrpc':'2.0','id':body.get('id'),'result':result})
    ThreadingHTTPServer.allow_reuse_address=False
    server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler)
    try: server.serve_forever()
    finally: server.server_close()

if __name__=='__main__': main()
