"""Persistent extraction cursors and bounded idle flushes for short conversations."""
from __future__ import annotations
import asyncio
from datetime import datetime,timedelta,timezone
import json
import hashlib
from .timezones import day_bounds
from .settings import resolve_model

class MemoryLifecycle:
    def __init__(self,chat):
        self.chat=chat;self.store=chat.store;self.task=None;self.pending_jobs={}

    def _save(self,scope,user,state):
        from .db import utc_now
        key='memory-progress-'+hashlib.sha256((scope+'\x00'+user).encode()).hexdigest()[:32]
        record={'id':key,'kind':'memory_cursor','created_at':utc_now(),'message':'自动记忆整理进度',
                'details':dict(zip(('cursor_at','cursor_id','last_attempt','last_error'),state),scope_id=scope,user_id=user)}
        with self.store._lock,self.store._conn:self.store._write('events',record,('kind','created_at'))

    def _state(self,scope,user):
        since=(datetime.now(timezone.utc)-timedelta(days=1)).isoformat()
        key='memory-progress-'+hashlib.sha256((scope+'\x00'+user).encode()).hexdigest()[:32]
        try:
            record=self.store._get('events',key)['details']
            return tuple(record.get(field,'') for field in ('cursor_at','cursor_id','last_attempt','last_error'))
        except KeyError:
            state=(since,'','','');self._save(scope,user,state);return state

    def pending(self,scope,user,limit=32):
        cursor_at,cursor_id,_,_=self._state(scope,str(user))
        with self.store._lock:
            rows=self.store._conn.execute("SELECT data FROM messages WHERE scope_id=? AND user_id=? AND role='user' AND (created_at>? OR (created_at=? AND id>?)) ORDER BY created_at,id LIMIT ?",(scope,str(user),cursor_at,cursor_at,cursor_id,limit)).fetchall()
        return [json.loads(row[0]) for row in rows]

    def attempt(self,scope,user,error=''):
        state=list(self._state(scope,user));state[2:]=[datetime.now(timezone.utc).isoformat(),error[:100]]
        self._save(scope,user,state)

    def advance(self,scope,user,records):
        if not records:return
        latest=max(records,key=lambda item:(item['created_at'],item['id']))
        state=list(self._state(scope,user));state[:2]=[latest['created_at'],latest['id']];state[3]=''
        self._save(scope,user,state)

    def allowed(self,require_model=True):
        limit=self.chat.settings.get()['memory'].get('daily_extractions',60)
        if not limit:return False
        model=resolve_model(self.chat.settings.get(),'memory')
        if require_model and (not model.get('model') or not model.get('base_url')):return False
        start,end=day_bounds(self.chat.settings)
        with self.store._lock:
            used=self.store._conn.execute("SELECT COUNT(*) FROM usage WHERE created_at>=? AND created_at<? AND json_extract(data,'$.purpose')='memory_extract'",(start,end)).fetchone()[0]
            claimed=self.store._conn.execute("SELECT COUNT(*) FROM events WHERE kind='memory_extract_attempt' AND created_at>=? AND created_at<?",(start,end)).fetchone()[0]
        return max(used,claimed)<limit

    def claim(self,scope,user):
        with self.store._lock:
            if not self.allowed(require_model=False):return False
            self.store.add_event('memory_extract_attempt','记忆整理配额已使用',scope_id=scope,user_id=user)
            return True

    def observe(self,scope,user):
        cfg=self.chat.settings.get()['memory']
        records=self.pending(scope,str(user),cfg.get('extraction_messages',6))
        key=(scope,str(user))
        if len(records)>=cfg.get('extraction_messages',6) and self.allowed() and key not in self.pending_jobs:
            job=asyncio.create_task(self.chat._extract(scope,str(user),automatic=True))
            self.pending_jobs[key]=job
            self.chat._jobs.add(job);job.add_done_callback(self.chat._jobs.discard)
            job.add_done_callback(lambda done:self.pending_jobs.pop(key,None))

    async def start(self):
        if self.task and not self.task.done():return
        async def poll():
            while True:
                await asyncio.sleep(15)
                if not self.allowed() or self.chat.settings.get()['paused']:continue
                since=(datetime.now(timezone.utc)-timedelta(days=1)).isoformat()
                with self.store._lock:
                    pairs=self.store._conn.execute("SELECT scope_id,user_id,MAX(created_at) FROM messages WHERE role='user' AND created_at>=? GROUP BY scope_id,user_id ORDER BY MAX(created_at) DESC LIMIT 32",(since,)).fetchall()
                idle=self.chat.settings.get()['memory'].get('extraction_idle_seconds',180)
                now=datetime.now(timezone.utc)
                for scope,user,latest in pairs:
                    if (now-datetime.fromisoformat(latest)).total_seconds()<idle:continue
                    state=self._state(scope,user)
                    if state[2] and (now-datetime.fromisoformat(state[2])).total_seconds()<300:continue
                    if self.pending(scope,user,1):await self.chat._extract(scope,user,automatic=True)
        self.task=asyncio.create_task(poll())

    async def close(self):
        if self.task:
            self.task.cancel()
            await asyncio.gather(self.task,return_exceptions=True)
