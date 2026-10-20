"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const calls=[];
const sandbox={window:{},state:{scope:'web:default',settings:{output:{}},personas:[]},e:escape,scope:()=>({persona_id:'default'}),personaName:()=> '初音未来',fmt:()=>'',imageURL:x=>x,
  icon:()=>'',tag:escape,getForm:form=>form.values,toast:()=>{},bootstrap:async()=>{},
  api:async(url,options)=>{calls.push([url,options]);return {};},
  field:(name,title,value)=>`<input name="${name}" value="${escape(value)}">`,
  toggle:(name,title,hint,checked)=>`<input type="checkbox" name="${name}" ${checked?'checked':''}>${escape(title)}${escape(hint)}`,
  select:(name,title,options,current)=>`<select name="${name}">${options.map(([value,label])=>`<option value="${value}" ${value===current?'selected':''}>${escape(label)}</option>`)}</select>`};
vm.createContext(sandbox);
for(const name of ['workspace-features.js','settings-page.js','chat-page.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../mikubot/static',name),'utf8'),sandbox,{filename:name});
async function main(){
  const html=sandbox.window.MikubotFeatures.outputSection();assert.match(html,/value="model" selected/);assert.match(html,/模型在生成时决定/);assert.match(html,/<details[^>]*>.*旧版长度参数/s);
  await sandbox.saveSettings('output',{values:{enabled:true,mode:'model',target_chars:'160',max_chars:'320',interval_ms:'600',max_parts:'8',platform_max_chars:'1800'}});
  assert.equal(calls[0][0],'/api/settings');assert.equal(calls[0][1].body.output.mode,'model');
  const record={id:'fixture',role:'assistant',content:'嗯。\n\n<script>不执行</script>\n这是同一条',metadata:{reply_parts:['嗯。','<script>不执行</script>\n这是同一条']}};
  let rendered=sandbox.renderMessageBase(record);assert.equal((rendered.match(/class="message-content"/g)||[]).length,2);assert.ok(!rendered.includes('<script>'));assert.match(rendered,/&lt;script&gt;/);
  rendered=sandbox.renderMessageBase({...record,metadata:{reply_parts:['不属于原文']}});assert.equal((rendered.match(/class="message-content"/g)||[]).length,1);assert.ok(!rendered.includes('不属于原文'));
  rendered=sandbox.renderMessageBase({...record,role:'user'});assert.equal((rendered.match(/class="message-content"/g)||[]).length,1);
  console.log('model output settings, legacy foldout, saved boundaries, escaping and canonical-text checks passed');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
