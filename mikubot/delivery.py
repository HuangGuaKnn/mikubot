"""Durable multipart receipts. Unknown deliveries are never replayed."""
from __future__ import annotations
import json
from uuid import uuid4
from fastapi import Body
from .db import utc_now
from .settings import resolved_identity


class DeliveryLedger:
    def __init__(self,store):self.store=store

    def save(self,record):
        record['updated_at']=utc_now()
        event={'id':record['id'],'kind':'qq_outbox','message':'QQ 分段发送记录','created_at':record['updated_at'],'details':record}
        with self.store._lock,self.store._conn:self.store._write('events',event,('kind','created_at'))
        return record

    def create(self,scope,user,parts,metadata,batch):
        # Metadata contains only source IDs and current authority, never callables.
        return self.save({'id':'outbox-'+uuid4().hex,'scope_id':scope,'user_id':str(user),
            'assistant_message_id':batch.get('logical_message_id'),'parts':[{'text':p,'status':'pending'} for p in parts],
            'source_ids':[e['message']['id'] for e in batch['entries']],
            'identity':batch['identity'],'dependencies':batch.get('dependencies') or {},
            'metadata':{k:metadata[k] for k in ('platform','platform_message_id','onebot_self_id','source_id') if k in metadata}})

    def get(self,key):return self.store._get('events',key)['details']

    def list(self,scope=None):
        with self.store._lock:
            rows=self.store._conn.execute("SELECT data FROM events WHERE kind='qq_outbox' ORDER BY created_at DESC LIMIT 100").fetchall()
        records=[json.loads(r[0])['details'] for r in rows]
        return [r for r in records if not scope or r['scope_id']==scope]

    def valid(self,record,flow):
        scope,user=record['scope_id'],record['user_id']
        if not flow.allowed(scope,user) or resolved_identity(flow.settings.get(),flow.store.get_scope(scope))!=record['identity']:return False
        chat=flow.chat;social=getattr(chat,'social',None) or flow._fallback
        if not social._allowed(scope):return False
        if set(record['source_ids']) & social._blocked_sources(scope):return False
        try:
            for key in record['source_ids']:
                if self.store.get_message(key)['scope_id']!=scope:return False
            if record.get('assistant_message_id'):self.store.get_message(record['assistant_message_id'])
        except KeyError:return False
        dep=record['dependencies']
        if hasattr(chat,'_changed') and chat._changed(dep.get('memory_versions',{}),dep.get('jargon_versions',{}),scope,user):return False
        if hasattr(chat,'_sources_changed') and chat._sources_changed(scope,dep.get('context_source_ids',record['source_ids'])):return False
        if hasattr(chat,'_knowledge_changed') and chat._knowledge_changed(dep.get('persona_id','default'),dep.get('knowledge_refs',{})):return False
        return True


def install_delivery(app,store,onebot,official):
    ledger=DeliveryLedger(store)
    @app.get('/api/delivery')
    async def deliveries(scope_id:str|None=None):
        return ledger.list(scope_id)

    @app.post('/api/delivery/{id}/resume')
    async def resume(id:str,payload:dict=Body(default={})):
        if payload.get('confirm') is not True:raise ValueError('请明确确认补发从未发送的后续段落')
        record=ledger.get(id)
        if not id.startswith('outbox-') or not isinstance(record.get('parts'),list):raise ValueError('发送记录无效')
        flow=(official if record['scope_id'].startswith('qqofficial:') else onebot)._flow
        async with flow._output_locks[record['scope_id']]:
            record=ledger.get(id)
            if not ledger.valid(record,flow):raise ValueError('来源、人格或权限已变化，不能补发旧回复')
            sent=0
            for index,part in enumerate(record['parts'],1):
                if part['status']!='pending':continue
                if sent:
                    import asyncio
                    from .output import output_config
                    await asyncio.sleep(output_config(flow.settings.get(),flow.store.get_scope(record['scope_id']))['interval_ms']/1000)
                if not ledger.valid(record,flow):break
                part['status']='sending';ledger.save(record)
                try:
                    ok=await flow.emit(record['scope_id'],part['text'],dict(record['metadata'],assistant_message_id=record.get('assistant_message_id'),output_part={'index':index,'total':len(record['parts'])}))
                except BaseException:
                    part['status']='unknown';ledger.save(record);raise
                part['status']='confirmed' if ok else 'unknown';ledger.save(record)
                if not ok:break
                sent+=1
            return {'sent':sent,'record':record}
