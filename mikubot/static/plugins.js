"use strict";
window.MikubotPlugins=(()=>{
  const ui=window.MikubotExperience,oldAction=ui.handleAction,oldSubmit=ui.handleSubmit;
  const example='def run(input):\n    return {"message": "你好，" + str(input.get("name", "博士"))}\n';
  async function render(){
    const data=await api('/api/plugins');
    return heading('LOCAL PLUGINS','插件','在本地聊天中说“帮我创建一个插件……”即可生成草稿，也可以手动编写。')+`<section class="panel settings-section"><h2>运行方式</h2><p>新建和修改后均为停用状态。查看代码并启用后，在本地聊天中明确说“运行插件 ID……”或点击运行。自动模式下明确说“创建插件并运行”，可连续完成。任务遵循电脑能力的审批、时限与停止设置；不自动安装依赖。</p><p>${data.runtime.enabled?'电脑能力已开启':'请先在系统设置开启电脑能力'} · ${e(data.runtime.runtime==='docker'?'Docker 隔离':'本机权限')} · ${e(data.runtime.approval_mode==='automatic'?'自动执行':'逐项确认')}</p><p class="help-caption">Docker 沙箱隔离主机系统，不保护工作目录内的文件；/workspace 是可写映射，脚本可在其中增删文件。本机运行拥有当前系统账户权限。</p><div class="section-actions">${button('新建插件','plugin-new','primary','plus')}</div></section><div class="card-grid">${data.items.map(item=>`<article class="panel settings-section"><h2>${e(item.name)}</h2><p><code>${e(item.id)}</code> · ${item.enabled?'已启用':'已停用'} · 修订 ${e(item.revision || '未知')}</p><p>${e(item.description || item.error || '')}</p><div class="section-actions">${button('查看 / 编辑','plugin-edit','ghost','',`data-id="${e(item.id)}"`)}${item.error?'':button(item.enabled?'停用':'启用','plugin-enable','ghost','',`data-id="${e(item.id)}" data-enabled="${!item.enabled}"`)}${item.enabled?button('运行','plugin-run','primary','',`data-id="${e(item.id)}"`):''}${button('删除','plugin-delete','danger','',`data-id="${e(item.id)}"`)}</div></article>`).join('') || '<p>还没有插件，可以从本地聊天或新建按钮开始。</p>'}</div>`;
  }
  function editor(item={}){openModal(item.id?'编辑插件（保存后停用）':'新建插件','',`<form data-form="plugin-editor"><div class="form-grid">${field('id','插件 ID',item.id || 'hello_plugin','text','小写字母、数字、下划线；以字母开头。',item.id?'readonly':'')}${field('name','名称',item.name || '')}${textarea('description','用途说明',item.description || '','','rows=3')}${textarea('code','Python 代码',item.code || example,'','rows=14')}</div><p>定义 run(input) 并返回可 JSON 序列化的结果。当前版本使用 Python 标准库；代码不会在服务进程中加载。</p><button class="btn primary" type="submit">保存草稿</button></form>`);}
  ui.handleAction=async(action,target)=>{
    if(!action.startsWith('plugin-'))return oldAction(action,target);
    const id=target.dataset.id;
    if(action==='plugin-new')editor();
    else if(action==='plugin-edit')editor(await api('/api/plugins/'+encodeURIComponent(id)));
    else if(action==='plugin-enable'){await api(`/api/plugins/${encodeURIComponent(id)}/enabled`,{method:'PUT',body:{enabled:target.dataset.enabled==='true'}});await renderPage();}
    else if(action==='plugin-delete'){await confirmAction('删除插件？','停止引用此插件的任务并删除代码。工作目录内已产生的文件会保留。',async()=>{await api('/api/plugins/'+encodeURIComponent(id),{method:'DELETE'});await renderPage();});}
    else if(action==='plugin-run')openModal('运行插件','',`<form data-form="plugin-run" data-id="${e(id)}">${textarea('input','输入 JSON','{}','','rows=7')}<button class="btn primary" type="submit">创建运行任务</button></form>`);
    else return oldAction(action,target);
    return true;
  };
  ui.handleSubmit=async(kind,form)=>{
    if(kind==='plugin-editor'){const data=Object.fromEntries(new FormData(form));await api('/api/plugins',{method:'POST',body:data});closeModal();toast('草稿已保存，启用后才能运行');await renderPage();return true;}
    if(kind==='plugin-run'){let input;try{input=JSON.parse(new FormData(form).get('input'));}catch{throw new Error('输入需为有效 JSON 对象');}const job=await api(`/api/plugins/${encodeURIComponent(form.dataset.id)}/run`,{method:'POST',body:{input,scope_id:state.scope.startsWith('web:')?state.scope:'web:default'}});closeModal();state.activeJob=job.id;await navigate('jobs');return true;}
    return oldSubmit(kind,form);
  };
  return {render};
})();
