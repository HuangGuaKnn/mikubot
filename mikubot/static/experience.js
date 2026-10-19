"use strict";

// The module shares the existing authenticated API and escape helpers. Remote
// content is always rendered as text; generated personas never execute scripts.
window.MikubotExperience = (() => {
  let liveSource = null, watchedJob = "", renderedPage = "", pairTimer = null;
  let attachments = [], attachmentScope = "", distillDraft = null, currentJob = null, pair = null;
  const jobNames = {queued:"排队中",running:"进行中",awaiting_approval:"等待确认",completed:"已完成",failed:"失败",cancelled:"已取消",interrupted:"已中断"};
  const inactive = job => ["completed","failed","cancelled","interrupted"].includes(job?.status);
  const unwrapJob = value => value?.job || value;
  const jobId = value => String(unwrapJob(value)?.id || "");
  const safeLink = value => /^(https?:\/\/|\/(?!\/))/i.test(String(value || "")) ? String(value) : "";
  const safeId = id => encodeURIComponent(String(id || ""));
  function costLabel(record = {}) {
    const configured = configuredModel();
    const known = record.cost_known === true || record.price_configured === true || Number(record.cost) > 0 || Number(configured.input_price) > 0 || Number(configured.output_price) > 0;
    return record.cost_known === false || !known ? "费用未知" : `¥ ${Number(record.cost || 0).toFixed(4)}`;
  }

  async function renderOverview() {
    const diagnostics = await api(`/api/diagnostics?${query({scope_id:state.scope})}`), model = configuredModel(), qq = diagnostics.qq || state.boot?.qq || {};
    const connected = qq.status?.connected || qq.connected;
    return heading("MIKUBOT","机器人管理","先完成一次聊天，再按需要接入 QQ、创建人格和开启电脑任务。",button("开始聊天","go-chat","primary","chat")) + `<section class="home-intro"><div class="home-identity"><div class="miku-mark" aria-hidden="true">m<span>♪</span></div><div><h2>${e(state.settings.identity?.name || "初音未来")}，已就绪。</h2><p>陪你聊天，记住值得记住的事，也能在你的授权下完成任务。默认人格是初音未来，配置随时可以调整。</p></div></div>${button("使用指南","go-help","","arrow")}</section><div class="status-cards">${[
      ["spark","语言模型",diagnostics.model?.configured ? "已配置" : "等待连接",model.model || "填入自己的服务地址和密钥，就能开始自然聊天。","quick-model","配置模型"],
      ["groups","QQ 连接",connected ? "已连接" : qq.enabled ? "正在等待连接" : "尚未启用","本机 NapCat、SnowLuma 支持自动配对，也可以使用 QQ 官方机器人。","local-qq","连接 QQ"],
      ["tools","电脑任务",state.settings.computer?.enabled ? "已开启" : "尚未开启","仅已认证的本地账户和你指定的 QQ 管理员可以发动。","computer-settings","管理权限"]
    ].map(([symbol,title,status,description,action,actionText]) => `<article class="status-card"><h3>${icon(symbol)}${e(title)}</h3><strong>${e(status)}</strong><p>${e(description)}</p>${button(actionText,action,"small")}</article>`).join("")}</div>${window.MikubotQuickStart.diagnosticsPanel(diagnostics)}<section class="panel" style="margin-top:20px"><div class="panel-head"><div><h2>按需要，逐步添加能力</h2><p>模型分工、自动学习与群聊规划都可以稍后设置。</p></div></div><div class="panel-body"><div class="distill-options"><button class="distill-option" data-action="start-distill">${icon("persona")}<strong>蒸馏一个人格</strong><small>从作品角色或你的 ZIP 语料中提炼人格，先预览与试聊，再应用。</small></button><button class="distill-option" data-page="jobs">${icon("tasks")}<strong>查看后台任务</strong><small>蒸馏、电脑任务的执行步骤、审批与结果，关闭网页后也能回来查看。</small></button></div></div></section>`;
  }

  function sessionSidebar() {
    const web = state.scopes.filter(item => item.id.startsWith("web:")), qq = state.scopes.filter(item => !item.id.startsWith("web:"));
    const row = item => `<button class="conversation-item ${item.id === state.scope ? "active" : ""}" data-action="scope-chat" data-id="${e(item.id)}" title="${e(item.name)}">${icon(item.id.startsWith("web:") ? "chat" : "groups")}<span>${e(item.name || "新对话")}</span></button>`;
    return `<aside class="conversations" aria-label="聊天会话">${button("新对话","new-chat","small","plus")}<p class="conversation-label">本地对话</p>${web.map(row).join("")}${qq.length ? `<p class="conversation-label">QQ 记录 · 只读</p>${qq.map(row).join("")}` : ""}</aside>`;
  }

  async function renderChat() {
    const [messages,jobs,runs,modelControl] = await Promise.all([api(`/api/messages?${query({scope_id:state.scope})}`),api(`/api/jobs?${query({scope_id:state.scope})}`),api(`/api/tool-runs?${query({scope_id:state.scope,status:"pending"})}`),window.MikubotPages ? window.MikubotPages.chatModelControl() : ""]);
    state.messages = rows(messages); state.liveJobs = rows(jobs); state.toolRuns = rows(runs);
    const local = state.scope.startsWith("web:"), job = state.liveJobs.find(item => !inactive(item));
    if (attachmentScope !== state.scope) { attachments = []; attachmentScope = state.scope; }
    const pending = state.toolRuns.filter(item => item.status === "pending" && !item.read_only);
    return heading("CHAT","聊天","本地聊天默认每条回应。电脑任务需要管理员身份与独立开关。",button("后台任务","go-jobs","","tasks")) + (state.boot?.setup_required ? notice("尚未连接语言模型。你可以先使用记事、待办、计算和基础检索。","warning","quick-model","连接模型") : "") + `<div class="chat-workspace">${sessionSidebar()}<section class="chat-layout"><header class="chat-top"><div class="chat-identity"><div class="chat-avatar">ミ</div><div><h3>${e(personaName(scope().persona_id))}</h3><p>${e(scope().name)} · ${local ? "管理台管理员 mikubot" : "QQ 历史记录"}</p></div></div><div class="inline-stack">${modelControl}${button("人格","go-persona","ghost small","persona")}${button("清空","clear-messages","ghost small","trash")}</div></header>${!local ? '<div class="chat-scope-note scope-warning">QQ 记录在此只读。点击“新对话”即可在本地聊天，不会向 QQ 发信。</div>' : ""}<div class="chat-feed" id="chat-feed">${state.messages.length ? state.messages.map(renderMessage).join("") : `<div class="empty-state"><div class="chat-welcome-glyph">♪</div><h3>今天想聊什么？</h3><p>说说近况，放入一份资料，或交给我一件事情。</p>${local ? '<div class="chat-suggestions"><button data-action="chat-suggestion" data-text="你好，介绍一下你自己吧">认识初音未来</button><button data-action="chat-suggestion" data-text="记住：我喜欢喝抹茶">记住我的偏好</button><button data-action="chat-suggestion" data-text="添加待办：周末整理文档">添加待办</button></div>' : ""}</div>`}${state.sending ? '<div class="pending-message"><span class="spinner small"></span>正在处理你的消息…</div>' : ""}<div id="live-job-detail">${job ? jobDetail(job,true) : ""}</div></div>${pending.length ? `<section class="jobs-mini" aria-label="等待审批的工具请求"><strong>有 ${pending.length} 项工具请求等待确认</strong>${pending.map(toolRunCard).join("")}</section>` : ""}<form class="chat-composer" data-form="chat"><div class="image-previews" id="image-previews"></div><div id="attachment-chips" class="attachment-chips">${attachmentChips()}</div><textarea id="chat-text" name="text" placeholder="${local ? (state.chatMode === "computer" ? "例如：整理这份文档，或运行项目并帮我找出错误…" : "发消息，或把想完成的事交给我…") : "点击“新对话”开始本地聊天"}" aria-label="发送消息" rows="2" ${!local || state.sending ? "disabled" : ""}>${e(state.draft)}</textarea><div class="composer-bottom"><div class="composer-tools"><button class="icon-button" type="button" data-action="attach-image" title="添加图片" aria-label="添加图片" ${!local || state.sending ? "disabled" : ""}>${icon("image")}</button><button class="icon-button" type="button" data-action="attachment-options" title="上传资料" aria-label="上传资料" ${!local || state.sending ? "disabled" : ""}>${icon("file")}</button><label class="mode-picker">模式<select id="chat-mode" aria-label="聊天模式" ${!local || state.sending ? "disabled" : ""}><option value="chat" ${state.chatMode !== "computer" ? "selected" : ""}>普通聊天</option><option value="computer" ${state.chatMode === "computer" ? "selected" : ""}>电脑任务</option></select></label><span class="composer-hint">Enter 发送 · Shift + Enter 换行</span></div>${state.sending ? button("停止等待","cancel-chat","small","stop") : `<button type="submit" class="btn primary" ${!local ? "disabled" : ""}>发送 ${icon("send")}</button>`}</div></form></section></div><p class="help-caption">上传资料先选择用途。开启电脑任务后，管理员明确提出的任务会自动执行，可随时在任务卡片停止；普通 QQ 用户不能发起。</p>`;
  }

  function attachmentChips() { return attachments.map((item,index) => `<span class="attachment-chip">${icon("file")}${e(item.name || item.filename || "资料")}<small>本次参考</small><button type="button" data-action="remove-attachment" data-index="${index}" aria-label="移除附件">×</button></span>`).join(""); }

  async function sendChat() {
    if (state.sending || !state.scope.startsWith("web:")) return;
    const text = $("#chat-text")?.value.trim() || "";
    if (!text && !state.images.length && !attachments.length) return;
    const scopeId = state.scope, payload = {scope_id:scopeId,text,images:state.images.map(item => item.data),attachments:attachments.map(item => item.id),mode:state.chatMode || "chat"};
    state.draft = text; state.sending = true; state.controller = new AbortController(); const controller = state.controller;
    await renderPage();
    try {
      const result = await api("/api/chat",{method:"POST",body:payload,signal:controller.signal});
      if (state.scope === scopeId) { state.draft = ""; state.images = []; attachments = []; }
      if (result.job) toast("电脑任务已创建，执行进度与结果会显示在当前聊天，可随时停止。");
      else if (result.pending_actions?.length) toast(`有 ${result.pending_actions.length} 项工具请求等待你确认。`);
    } catch (error) { toast(error.name === "AbortError" ? "已停止等待。后台任务请在任务页查看并停止。" : error.message,error.name !== "AbortError"); }
    finally { state.sending = false; state.controller = null; await bootstrap(); $("#chat-text")?.focus(); }
  }

  function jobDetail(job,compact = false) {
    const approval = job.approval, result = job.result || {}, events = Array.isArray(job.events) ? job.events : [];
    const eventHTML = item => {
      const data = item.data && typeof item.data === "object" ? item.data : item;
      const names = {started:"开始处理",progress:"处理进度",authorized:"按已开启权限执行",approval:"等待审批",approved:"已批准",tool_result:"操作结果",completed:"完成",stopped:"已停止",failed:"处理失败"};
      const output = data.output ?? data.content ?? data.result;
      const text = typeof output === "string" ? output : output == null ? "" : toolJSON(output,10000);
      return `<div class="job-step"><strong>${e(data.stage || names[item.type] || item.type || "进度")}</strong> ${e(data.message || data.summary || data.tool || "")}${text ? `<pre>${e(String(text).slice(0,10000))}</pre>` : ""}</div>`;
    };
    return `<article class="${compact ? "chat-inline-progress" : "record-card job-card"}" data-job-id="${e(job.id)}"><div class="record-card-head"><div><h3>${e(job.title || (job.kind === "distillation" ? "人格蒸馏" : "电脑任务"))}</h3><p class="help-caption">${e(job.stage || "")} ${job.message ? "· " + e(job.message) : ""}</p></div>${tag(jobNames[job.status] || job.status,job.status === "awaiting_approval" ? "gold" : job.status === "failed" ? "red" : "gray")}</div>${job.error ? notice(job.error,"danger") : ""}${result.warnings?.length ? notice(result.warnings.join("；"),"warning") : ""}${approval && job.status === "awaiting_approval" ? `<div class="notice warning">${icon("shield")}<p>${e(approval.summary || "下一步需要你的确认")}</p></div><pre class="tool-argument-preview">${e(toolJSON(approval.details || {},4000))}</pre>${button("查看并批准本次动作","job-approve","primary small","shield",`data-id="${e(job.id)}" data-approval="${e(approval.id)}"`)}` : ""}${events.length && !compact ? `<details class="details" ${!inactive(job) ? "open" : ""}><summary>执行记录（${events.length}）</summary>${events.slice(-30).map(eventHTML).join("")}</details>` : ""}${result.reply || result.summary ? `<p class="record-text">${e(result.reply || result.summary)}</p>` : ""}${result.persona || result.system_prompt || result.persona_text || result.personality || result.prompt ? `<div class="persona-draft">${e(result.persona?.system_prompt || result.system_prompt || result.persona_text || result.personality || result.prompt)}</div>` : ""}<div class="record-actions">${!inactive(job) ? button("停止任务","job-cancel","ghost small","stop",`data-id="${e(job.id)}"`) : ""}${job.resumable ? button("从检查点继续","job-resume","small","refresh",`data-id="${e(job.id)}"`) : ""}${compact ? button("查看完整任务","view-job","ghost small","arrow",`data-id="${e(job.id)}"`) : ""}${job.kind === "distillation" && job.status === "completed" ? button("试聊人格草稿","trial-persona","small","chat",`data-id="${e(job.id)}"`) + button("保存为人格副本","apply-distill","primary small","persona",`data-id="${e(job.id)}"`) + (result.artifact || result.skill_available ? `<a class="btn small" href="/api/persona/distill/${safeId(job.id)}/artifact" download>下载 Skill 包</a>` : "") : ""}${(result.files || result.artifacts || []).map(file => { const url = safeLink(file.url || file.download_url); return url ? `<a class="job-file-link" href="${e(url)}" download>${icon("file")}${e(file.name || "下载结果")}</a>` : ""; }).join("")}</div><p class="help-caption">${e(fmt(job.updated_at || job.created_at,true))}${job.id ? " · 任务 " + e(job.id) : ""}</p></article>`;
  }

  async function renderJobs() {
    const jobs = rows(await api("/api/jobs")); state.liveJobs = jobs;
    return heading("TASKS","后台任务","查看执行步骤与实际结果，正在运行的任务可随时停止。",button("刷新任务","refresh","","refresh")) + (jobs.length ? `<div id="jobs-list">${jobs.map(job => jobDetail(job)).join("")}</div>` : empty("tasks","还没有后台任务","在聊天中选择“电脑任务”，或在人格页开始一次蒸馏。","go-chat","开始聊天"));
  }

  function watch(job) {
    if (!job || inactive(job)) { closeStream(); return; }
    if (watchedJob === job.id && liveSource) return;
    closeStream(); watchedJob = job.id;
    liveSource = new EventSource(`/api/jobs/${safeId(job.id)}/stream`);
    const update = event => {
      let data; try { data = JSON.parse(event.data); } catch { return; }
      const received = data.job || data;
      if (received.id === watchedJob && received.status) applyLiveJob(received);
      else api(`/api/jobs/${safeId(watchedJob)}`).then(value => applyLiveJob(unwrapJob(value))).catch(() => {});
    };
    liveSource.onmessage = update;
    for (const name of ["job","progress","update","completed","approval","state","snapshot"]) liveSource.addEventListener(name,update);
    liveSource.onerror = () => { closeStream(); if ($("#live-job-detail")) $("#live-job-detail").insertAdjacentHTML("beforeend",'<p class="help-caption">实时连接已中断，任务仍保存在后台。点击刷新查看最新状态。</p>'); };
  }

  function closeStream() { if (liveSource) liveSource.close(); liveSource = null; watchedJob = ""; }
  function applyLiveJob(job) {
    const previous = (state.liveJobs || []).findIndex(item => item.id === job.id);
    if (previous >= 0) state.liveJobs[previous] = job;
    currentJob = job;
    if (state.page === "chat" && job.scope_id === state.scope && $("#live-job-detail")) $("#live-job-detail").innerHTML = jobDetail(job,true);
    if ($('#modal [data-job-id]')?.dataset.jobId === job.id && !$('#modal form')) { const body=$('#modal .modal-body'); if(body)body.innerHTML=jobDetail(job); }
    if (state.page === "jobs") { const existing = $$('[data-job-id]').find(item => item.dataset.jobId === job.id); if (existing) existing.outerHTML = jobDetail(job); }
    if (inactive(job)) { closeStream(); if (state.page === "chat") refreshMessages().catch(() => {}); }
  }
  async function refreshMessages() { state.messages = rows(await api(`/api/messages?${query({scope_id:state.scope})}`)); const feed = $("#chat-feed"); if (feed) { const detail = $("#live-job-detail")?.outerHTML || '<div id="live-job-detail"></div>'; feed.innerHTML = state.messages.map(renderMessage).join("") + detail; feed.scrollTop = feed.scrollHeight; } }

  async function renderSettings() {
    const [base,admins,security] = await Promise.all([window.MikubotExperience.baseSettings(),api("/api/admins"),window.MikubotAuth ? window.MikubotAuth.settingsPanel() : ""]);
    state.admins = rows(admins); const computer = state.settings.computer || {};
    const adminPanel = `<section class="panel settings-section section-anchor" id="admins-section"><div class="section-title">${icon("shield")}<div><h2>管理员账号</h2><p>谁可以在对话中发动电脑任务与管理操作。</p></div></div><div class="admin-row"><div><strong>mikubot ${tag("内置管理台管理员")}</strong><small>通过桌面或浏览器认证的管理台账户，始终保留。</small></div></div>${state.admins.filter(item => item.platform !== "local" && item.id !== "mikubot").map(item => `<div class="admin-row"><div><strong>${e(item.label || item.name || "QQ 管理员")}</strong><small>${e(item.platform || "qq")} · ${e(item.user_id || item.account_id || "")}${item.instance_id ? " · " + e(item.instance_id) : ""}</small></div>${button("移除","remove-admin","ghost small","trash",`data-id="${e(item.id)}"`)}</div>`).join("")}<div class="section-actions">${button("60秒快速配对","pair-admin-auto","primary","link")}${button("手动核对配对","pair-admin","","link")}${button("手动添加账号","new-admin","","plus")}</div><p class="help-caption">使用真实发送者 ID 判断权限，昵称、群主身份、转发及引用不授予权限。允许聊天名单在 QQ 连接中单独设置。</p></section>`;
    const computerPanel = `<section class="panel settings-section section-anchor" id="computer-section"><div class="section-title">${icon("tools")}<div><h2>电脑任务</h2><p>本机命令、Python 与文件操作；任务步骤与运行结果保存在聊天中。</p></div></div>${notice("本机模式使用当前系统账户权限，工作目录不是沙箱。Docker 模式在本机 Linux 容器中断网运行代码，仅映射选定工作目录；需要先准备 Docker 与镜像，不可用时停止，不会降级为本机执行。Docker 隔离开启时默认禁止沙箱外 MCP 工具，可在高级设置明确放行。管理员任务按所选审批方式执行。","warning")}<form data-form="computer-settings">${toggle("enabled","开启电脑任务","仅管理员可发起，按下方执行环境与确认方式运行；可随时停止。",computer.enabled)}<div class="form-grid" style="margin-top:15px">${select("runtime","执行环境",[["local","本机账户权限"],["docker","Docker 隔离执行（默认断网）"]],computer.runtime || "docker","data-full")}${field("workspace","工作目录",computer.workspace || "","text","请填写已有的绝对路径；留空使用数据目录下的 workspace。文件工具限制在此目录；仅本机模式的 Shell 与 Python 使用本机账户权限。","data-full")}</div><details class="details"><summary>高级执行限制</summary><div class="form-grid" style="margin-top:12px">${toggle("allow_external_tools","允许沙箱外 MCP 工具","Docker 隔离时默认关闭。开启后 MCP 按服务自身权限运行，不受代码沙箱保护；其他管理员和服务允许列表仍有效。",computer.allow_external_tools)}${select("approval_mode","操作确认",[["automatic","自动执行（仅管理员）"],["per_action","每步确认"]],computer.approval_mode || "automatic")}${field("max_steps","每个任务最多步骤",computer.max_steps ?? 12,"number","达到上限后停止继续操作。","min=\"1\" max=\"100\"")}${field("timeout_seconds","单次操作超时（秒）",computer.timeout_seconds ?? 60,"number","较长任务可在记录中查看结果。","min=\"1\" max=\"600\"")}${field("max_output_chars","最多记录输出字符",computer.max_output_chars ?? 16000,"number","过长输出会限制展示。","min=\"1000\" max=\"100000\"")}</div></details><div class="section-actions"><button class="btn primary" type="submit">保存电脑任务设置</button>${button("检查隔离环境","runtime-check","","shield")}${button("打开任务聊天","computer-chat","","chat")}</div></form></section>`;
    const updates = window.MikubotUpdates ? await window.MikubotUpdates.settingsPanel() : "";
    return base.replace('<div class="settings-main">','<div class="settings-main">' + updates + security + adminPanel + computerPanel + schedulerPanel()).replace('<form data-form="qq">',localConnectorPanel() + (window.MikubotPages ? window.MikubotPages.qqIngress(state.boot?.qq) : "") + '<form data-form="qq">');
  }

  function localConnectorPanel() {
    return `<div class="quick-connector-guide"><strong>连接本机 NapCat / SnowLuma</strong><p>连接器已安装并登录 QQ 后，可自动创建反向 WebSocket，保留其他连接配置。</p>${button("自动配对本机 QQ","local-qq","primary small","link")} ${button("连通性自检","qq-self-test","ghost small","shield")}</div>`;
  }

  async function pollPairing() {
    if(!pair?.automatic || !$("#modal")?.open)return;
    const id=pair.id, left=Math.max(0,Math.ceil(pair.expires_at-Date.now()/1000));
    if(!left){$("#pairing-result").textContent="配对模式已结束，请重新开启。";return;}
    try {
      const result=await api(`/api/admins/pairing/${safeId(id)}`);
      if(pair?.id!==id || !$("#modal")?.open)return;
      if(result.status==='bound'){pair=null;closeModal();toast('QQ管理员已自动绑定，可在管理员列表撤销。');await bootstrap();return;}
      $("#pairing-result").textContent=`剩余 ${left} 秒。用目标QQ私聊发送上方完整命令，持码账号将自动成为管理员。`;
      pairTimer=setTimeout(pollPairing,1000);
    } catch(error){const node=$("#pairing-result");if(node)node.textContent=error.message;}
  }

  function schedulerPanel() {
    const cfg=state.settings.scheduler || {};
    return `<section class="panel settings-section"><h2>并发与排队</h2><p class="help-caption">同一会话保持顺序；前台聊天优先于后台学习。服务商有限流时保持默认并发1。</p><form data-form="queue-settings"><div class="form-grid">${field('model_concurrency','每个模型并发数',cfg.model_concurrency ?? 1,'number','','min="1" max="8"')}${field('model_queue_limit','每个模型最多排队请求',cfg.model_queue_limit ?? 32,'number','','min="1" max="200"')}${field('background_queue_limit','后台学习排队上限',cfg.background_queue_limit ?? 16,'number','','min="1" max="100"')}${field('scope_queue_limit','每个会话排队上限',cfg.scope_queue_limit ?? 8,'number','','min="1" max="32"')}</div><button class="btn" type="submit">保存调度设置</button></form></section>`;
  }

  // Small Markdown reader: raw HTML, remote images and script URLs remain text.
  function markdown(text) {
    const lines = String(text || "").split(/\r?\n/), result = [], toc = [];
    let code = [], inCode = false, paragraph = [], list = false, count = 0;
    const inline = value => e(value).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\[([^\]]+)\]\(([^\s)]+)\)/g,(all,title,url) => { const decoded = url.replaceAll("&amp;","&"); return safeLink(decoded) || /^#[a-zA-Z0-9_-]+$/.test(decoded) ? `<a href="${e(decoded)}" ${decoded.startsWith("http") ? 'target="_blank" rel="noopener noreferrer"' : ""}>${title}</a>` : title; });
    const flush = () => { if (paragraph.length) result.push(`<p>${inline(paragraph.join("\n"))}</p>`); paragraph = []; if (list) result.push("</ul>"); list = false; };
    for (const line of lines) {
      if (/^```/.test(line)) { flush(); if (inCode) { result.push(`<pre>${e(code.join("\n"))}</pre>`); code=[]; } inCode = !inCode; continue; }
      if (inCode) { code.push(line); continue; }
      const headingMatch = /^(#{1,4})\s+(.+)$/.exec(line), bullet = /^\s*(?:[-*]|\d+\.)\s+(.+)$/.exec(line);
      if (headingMatch) { flush(); const id = `guide-${++count}`, level = Math.max(2,Math.min(3,headingMatch[1].length)); result.push(`<h${level} id="${id}">${inline(headingMatch[2])}</h${level}>`); if (headingMatch[1].length <= 2) toc.push(`<a href="#${id}">${e(headingMatch[2])}</a>`); }
      else if (bullet) { if (paragraph.length) { result.push(`<p>${inline(paragraph.join("\n"))}</p>`); paragraph=[]; } if (!list) { result.push("<ul>"); list=true; } result.push(`<li>${inline(bullet[1])}</li>`); }
      else if (!line.trim()) flush(); else { if (list) { result.push("</ul>"); list=false; } paragraph.push(line); }
    }
    flush(); if (code.length) result.push(`<pre>${e(code.join("\n"))}</pre>`);
    return `<nav class="guide-toc" aria-label="指南目录">${toc.join("")}</nav><article class="guide-document">${result.join("")}</article>`;
  }
  async function renderHelp() { const response = await api("/static/guide.md",{raw:true}), text = await response.text(); return heading("HELP","使用指南","从第一次聊天，到 QQ 连接、人格蒸馏、电脑任务和源码部署。",button("运行诊断","go-diagnostics","","shield")) + markdown(text); }

  function distillChooser() {
    distillDraft = null;
    openModal("创建人格","生成过程会使用你配置的模型并计入用量。先确认资料，再生成草稿。",`<div class="distill-options"><button type="button" class="distill-option" data-action="persona-generate">${icon("spark")}<strong>按描述直接生成</strong><small>写下要求，直接生成人格草稿，不需要资料或 ZIP。</small></button><button type="button" class="distill-option" data-action="distill-character">${icon("search")}<strong>已有作品角色</strong><small>输入作品和角色，搜索资料并确认身份、版本，生成聊天人格与 Skill 包。</small></button><button type="button" class="distill-option" data-action="distill-corpus">${icon("upload")}<strong>已有语料 / 真人表达</strong><small>上传 ZIP，选择文件与目标说话者，仅提炼人设描写，不生成 Skill。</small></button></div><p class="sensitive-note">仅选中的文本发送到你配置的模型服务。真人语料不自动联网补全生平，不推断材料中不存在的私事。</p>`);
  }

  function characterForm() { openModal("蒸馏作品角色","先搜索候选，确认具体角色和作品版本后才开始生成。",`<div class="form-grid">${field("work","作品名称","","text","例如一部动画、游戏、小说或电影。","required data-full maxlength=\"200\"")}${field("character","角色名称","","text","同名角色会在下一步提供候选。","required data-full maxlength=\"200\"")}</div>`,"distill-search",null,"搜索候选"); }

  function generateForm() {
    openModal("按描述生成人格","输入你的要求，由当前模型生成可编辑草稿；不检索网页，不生成 Skill。",`<div class="form-grid">${field("name","人格名称（可选）","","text","留空使用“自定义人格”。","data-full maxlength=\"100\"")}${textarea("description","希望它是什么样的人？","","例如：喜欢天文、说话简洁，有自己的观点；我疲惫时先听我说，不急着讲道理。","required rows=\"7\" maxlength=\"6000\"")}</div><p class="help-caption">描述会发送给已配置的模型，计入用量。生成后可预览、试聊，再保存。</p>`,"persona-generate",null,"生成人格草稿");
  }

  async function profilePanel() {
    const config = await api('/api/bot-profiles');
    state.botProfiles = config;
    return `<section class="panel"><div class="panel-head"><div><h2>机器人配置</h2><p>统一选择人格、模型和回复规则。新聊天继承默认配置；记忆隔离不受影响。</p></div>${button("新增配置","profile-new","small","plus")}</div><div class="panel-body"><div class="record-grid">${config.items.map(p => `<article class="record-card"><h3>${e(p.name)} ${p.id === config.default_id ? tag("默认配置") : ""}</h3><p>人格：${e(personaName(p.values.persona_id || "default"))}</p><p class="help-caption">${config.scopes.filter(s => s.profile_id === p.id || s.profile_id === "" && p.id === config.default_id).length} 个聊天使用</p><div class="record-actions">${button("编辑","profile-edit","small","edit",`data-id="${e(p.id)}"`)}${button("绑定聊天","profile-bind","small","groups",`data-id="${e(p.id)}"`)}${p.id !== config.default_id ? button("删除","profile-delete","ghost small","trash",`data-id="${e(p.id)}"`) : ""}</div></article>`).join("")}</div>${config.scopes.some(s => s.profile_id == null) ? notice("已有聊天保留原来的独立设置。点击“绑定聊天”可批量迁入统一配置，绑定后清除这些聊天的配置覆盖；聊天记录和记忆保留。") : ""}</div></section>`;
  }

  function profileForm(id) {
    const config=state.botProfiles, item=config.items.find(p=>p.id===id), values=item?.values || {};
    openModal(item ? "编辑机器人配置" : "新增机器人配置","保存后对继承此配置的聊天生效；单独覆盖的设置保留。",`<input type="hidden" name="id" value="${e(item?.id || '')}"><div class="form-grid">${field("name","配置名称",item?.name || "","text","例如：默认陪伴、工作群。","required data-full maxlength=\"80\"")}${select("persona_id","人格",state.personas.map(p=>[p.id,p.name]),values.persona_id || "default")}${select("model_id","聊天模型",[["","跟随全局聊天模型"],...(state.settings.providers || []).map(p=>[p.id,p.name || p.model])],values.model_id || "")}${select("activity","群聊回应方式",[["quiet","仅被提及"],["balanced","适时回应"],["active","积极接话"]],values.activity || "balanced")}</div>${toggle("is_default","设为默认配置","所有跟随默认配置的聊天与新聊天会使用它。",item?.id===config.default_id)}<details class="details"><summary>回复与工具能力</summary>${toggle("trigger_at","被 @ 时触发","仍受允许名单与回复规则约束。",values.trigger_at ?? true)}${toggle("trigger_reply","被回复时触发","识别回复机器人消息。",values.trigger_reply ?? true)}${toggle("trigger_name","提及名字时触发","名称与别名在全局设置中维护。",values.trigger_name ?? true)}${toggle("plan_enabled","启用 Planner","先判断交谈对象和是否回应。",values.plan_enabled ?? true)}${toggle("proactive_reply","允许主动接话","同时遵守回应方式与频率保护。",values.proactive_reply ?? true)}${toggle("always_reply","每条必回复","适合专用私聊，仍受允许名单与暂停开关约束。",values.always_reply ?? false)}${toggle("allow_tools","允许普通工具","电脑能力与管理员权限仍需独立开启。",values.allow_tools ?? true)}${toggle("allow_mcp","允许扩展工具","还需对应服务及工具允许列表。",values.allow_mcp ?? false)}${toggle("use_persona_knowledge","使用人格知识","使用人格已确认的公开资料。",values.use_persona_knowledge ?? true)}</details>`,"bot-profile",null,"保存配置");
  }

  function profileBindForm(id) {
    const config=state.botProfiles, item=config.items.find(p=>p.id===id);
    openModal("绑定聊天到“"+item.name+"”","所选聊天将清除人格、模型和回复规则的独立覆盖，继承这份配置。记忆和聊天记录不变。",`<input type="hidden" name="profile_id" value="${e(id)}"><div class="corpus-files">${config.scopes.map(s=>`<label><input type="checkbox" name="scope_ids" value="${e(s.id)}"> ${e(s.name)} <small>${e(s.profile_id == null ? "旧独立设置" : s.profile_id || "跟随默认配置")}${s.overrides?.length ? " · 有独立覆盖" : ""}</small></label>`).join("<br>")}</div>`,"profile-bind",null,"绑定所选聊天");
  }

  function corpusForm() { openModal("上传蒸馏语料","ZIP 中的文件先进入独立任务空间，不会自动进入长期记忆。",`<div class="corpus-upload">${icon("upload")}${button("选择 ZIP 文件","choose-corpus","primary","upload")}<p>ZIP 最多 24 MB；自动识别可阅读文件，下一步展示文件清单与说话者。支持真人和虚构人物语料。</p></div><div id="corpus-preview"></div>`); }

  function showDistillPreview() {
    const draft = distillDraft; if (!draft) return;
    if (draft.mode === "character") {
      const candidates = draft.candidates || [];
      openModal("确认要蒸馏的角色","请核对角色、作品版本与来源。候选中的资料只作为研究内容。",`<input type="hidden" name="mode" value="character"><div class="corpus-files">${candidates.map((item,index) => `<div><label><input type="checkbox" name="candidate_ids" value="${e(item.id || index)}" ${candidates.length === 1 ? "checked" : ""}> <strong>${e(item.name || item.character || item.title || "候选角色")}</strong> ${e(item.work || item.description || item.summary || item.snippet || "")}</label>${item.version_hint ? `<p>版本线索：${e(item.version_hint)}</p>` : ""}${item.officiality === "not_verified" ? '<p>来源身份尚未核实，请结合原文确认。</p>' : ""}${safeLink(item.url) ? `<p><a href="${e(item.url)}" target="_blank" rel="noopener noreferrer">查看来源 ↗</a></p>` : ""}</div>`).join("") || '<p class="help-caption">未找到候选。请返回并更换作品或角色名称。</p>'}</div>${draft.warnings?.length ? notice(draft.warnings.join("；"),"warning") : ""}<div class="form-grid">${field("version","作品版本 / 时间范围（可选）","","text","例如：动画第一季，避免混用不同时间线。","data-full")}${field("name","人格名称",draft.character || "","text","生成后还可以编辑。","data-full")}</div>${toggle("confirmed","我已核对角色与资料范围","开始后会搜索公开资料并调用模型，生成 Skill 包与聊天人格。",false)}`,"distill-start",null,"开始蒸馏");
    } else {
      const files = draft.files || [], speakers = draft.speakers || [];
      openModal("确认语料与目标说话者","只使用选中的可读文件。不联网补充真人资料，不自动写入记忆。",`<input type="hidden" name="mode" value="corpus"><div class="corpus-files">${files.map((file,index) => `<div><label><input type="checkbox" name="selected_files" value="${e(file.id || file.path || file.name || index)}" ${file.readable !== false && !["skipped","failed","unsupported"].includes(file.status) ? "checked" : "disabled"}> <strong>${e(file.name || file.path)}</strong> ${e({readable:"可读取",skipped:"已跳过",failed:"读取失败"}[file.status] || file.status || "可读取")} ${e(file.reason || file.error || "")} ${file.characters ? e(file.characters) + " 字符" : ""} ${file.warnings?.length ? e(file.warnings.join("；")) : ""}</label></div>`).join("")}</div><div class="form-grid">${speakers.length ? select("target_speaker","目标说话者",[["","请选择"],...speakers.map(item => typeof item === "string" ? [item,item] : [item.id || item.name,item.name || item.label || item.id])],"","required data-full") : field("target_speaker","目标说话者 / 人物","","text","说明需要提炼谁。多人材料必须区分目标、引用和转述。","required data-full")}${field("name","人格名称","","text","可用真实姓名、昵称或你自定义的名称。","required data-full maxlength=\"100\"")}</div>${draft.warnings?.length ? notice(draft.warnings.join("；"),"warning") : ""}${toggle("confirmed","确认使用所选语料蒸馏人设","只生成人设描写，不生成 Skill。选中文本会发送给你的模型服务。",false)}`,"distill-start",null,"开始蒸馏");
    }
    $("#modal").classList.add("modal-wide");
  }

  async function showJob(id) { currentJob = unwrapJob(await api(`/api/jobs/${safeId(id)}`)); openModal("任务详情","关闭窗口后，任务仍在后台保存。",jobDetail(currentJob)); $("#modal").classList.add("modal-wide"); watch(currentJob); }

  function modelListId(form) { return $('[name="model"]',form)?.getAttribute("list") || "model-list"; }
  async function listModels(target) {
    const form = target.closest("form"); if (!form) throw new Error("请在模型配置表单中读取列表。");
    target.disabled = true;
    try { const data = modelPayload(form); if (getForm(form).id) data.provider_id = getForm(form).id; else if(form.dataset?.form === "quick-start") data.provider_id=window.MikubotQuickStart.modelSelection(state.settings).provider_id; const result = await api("/api/models",{method:"POST",body:data}), models = Array.isArray(result) ? result : result.models || result.data || [], list = document.getElementById(modelListId(form)); if (list) list.innerHTML = models.map(item => `<option value="${e(typeof item === "string" ? item : item.id)}"></option>`).join(""); toast(`已读取 ${models.length} 个模型，请在模型名称框中选择。`); }
    finally { target.disabled = false; }
  }

  async function localQQ() {
    openModal("自动配对本机 QQ","连接器需已安装、运行并完成 QQ 登录。管理口令仅用于本次配置，不保存在表单或日志中。",`<div class="form-grid">${select("adapter","本机连接器",[["napcat","NapCat"],["snowluma","SnowLuma"]],state.settings.onebot?.adapter === "snowluma" ? "snowluma" : "napcat","data-full")}${field("webui_url","管理地址","","url","检测后点选管理地址；仅访问本机地址。","required data-full placeholder=\"http://127.0.0.1:6099\"")}${field("password","管理口令 / Token","","password","这是连接器管理台的口令，不是模型密钥。","data-full autocomplete=\"off\"")}${field("totp","动态验证码（如已开启）","","text","未开启两步验证时留空。","data-full autocomplete=\"one-time-code\"")}${field("account_id","QQ 账号（可选）","","text","连接器有多个账号时，选择需要绑定的账号。","data-full")}</div><div class="section-actions">${button("检测连接器","discover-local-qq","","search")}</div><div id="local-qq-result" aria-live="polite"></div>`,"local-qq",null,"创建反向连接并验证");
  }

  function connectionResult(result) {
    const steps = result.steps || result.checks || [];
    return `<div class="local-connector-result"><strong>${e(result.message || (result.connected ? "已检测到实际连接" : "已读取连接结果"))}</strong>${steps.map(step => `<div class="connector-step"><span>${step.ok || step.status === "ok" || step.status === "connected" ? "✓" : "·"}</span><div>${e(step.title || step.step || step.name || "检查")} · ${e(step.message || step.detail || step.status || "")}</div></div>`).join("")}${result.candidates?.length ? `<div class="corpus-files">${result.candidates.map(item => `<div>${e(item.adapter || item.connector || item.name || "连接器")} · ${e(item.webui_url || item.url || "")} ${e(item.message || item.status || "")} ${item.reachable && item.webui_url ? button("使用此地址","select-local-qq","small","",`data-url="${e(item.webui_url)}" data-adapter="${e(item.adapter)}"`) : ""}</div>`).join("")}</div>` : ""}${result.connected === false ? '<p class="help-caption">配置成功与实际连接分别判断。请确认连接器仍在运行，再发送一条测试消息。</p>' : ""}</div>`;
  }

  async function handleAction(action,target) {
    if(window.MikubotUpdates && await window.MikubotUpdates.handleAction(action,target))return true;
    const id = target.dataset.id;
    if (action === "new-chat") { if (state.sending) throw new Error("请先等待当前回复或停止等待。"); const result = await api("/api/scopes",{method:"POST",body:{name:"新对话",kind:"web",private_reply_policy:"always"}}), item = result.scope || result; state.scope = item.id; state.draft="";state.images=[]; attachments=[]; localStorage.setItem("qunyu-scope",state.scope); await bootstrap(); await navigate("chat"); }
    else if (action === "start-distill") distillChooser();
    else if (action === "distill-character") characterForm();
    else if (action === "persona-generate") generateForm();
    else if (action === "https-guide") {
      const result=await api('/api/remote/https-guide',{method:'POST',body:{public_url:$('#auth-public-url')?.value || ''}});
      openModal('HTTPS部署配置',result.message,textarea('caddyfile','保存为Caddyfile',result.caddyfile,'','readonly rows="5"')+`<ol>${result.steps.map(step=>`<li>${e(step)}</li>`).join('')}</ol>`);
    }
    else if (action === "qq-self-test") {
      openModal("QQ 连通性自检","只读检查，不自动向 QQ 发送消息。",'<p class="help-caption">正在检查本机端口和实际连接…</p>');
      const result=await api('/api/qq/self-test',{method:'POST',body:{}});
      openModal("QQ 连通性自检",result.message,`<div class="diagnostic-list">${result.checks.map(c=>`<article class="record-card"><h3>${c.status==='passed'?'🟢':c.status==='failed'?'🔴':'⚪'} ${e(c.title)}</h3><p>${e(c.message)}</p></article>`).join('')}</div>`);
    }
    else if (action === "profile-new") profileForm();
    else if (action === "profile-edit") profileForm(id);
    else if (action === "profile-bind") profileBindForm(id);
    else if (action === "profile-delete") {
      const config=state.botProfiles;
      if(config.scopes.some(s=>s.profile_id===id))throw new Error("请先重新绑定使用这份配置的聊天。");
      await confirmAction("删除这份配置？","人格库和记忆会保留。",async()=>{await api('/api/bot-profiles',{method:'PUT',body:{default_id:config.default_id,items:config.items.filter(p=>p.id!==id)}});},"删除配置");
    }
    else if (action === "use-persona") {
      const config=await api('/api/bot-profiles'), profile=config.items.find(p=>p.id===config.default_id);
      await confirmAction("更换默认配置的人格？","跟随默认配置且没有人格覆盖的聊天会使用这个人格，记忆隔离不变。",async()=>{profile.values.persona_id=id;await api('/api/bot-profiles',{method:'PUT',body:{default_id:config.default_id,items:config.items}});},"设为默认人格");
    }
    else if (action === "distill-corpus") corpusForm();
    else if (action === "choose-corpus") $("#corpus-input").click();
    else if (action === "view-job") await showJob(id);
    else if (action === "job-cancel") { await api(`/api/jobs/${safeId(id)}/cancel`,{method:"POST",body:{}}); toast("已请求停止任务"); closeModal(); await bootstrap(); }
    else if (action === "job-approve") { const approvalId = target.dataset.approval, job = unwrapJob(await api(`/api/jobs/${safeId(id)}`)); if (job.approval?.id !== approvalId || job.status !== "awaiting_approval") throw new Error("这次审批已变化，请刷新任务。"); openModal("批准这一次动作",`${job.title || "任务"} · ${id}`,`<input type="hidden" name="job_id" value="${e(id)}"><input type="hidden" name="approval_id" value="${e(approvalId)}"><p class="record-text">${e(job.approval.summary)}</p><pre class="tool-review-json">${e(toolJSON(job.approval.details,12000))}</pre><p class="help-caption">批准只对本任务的本次动作生效；执行后自动继续任务。</p>`,"job-approval",null,"批准并继续"); }
    else if (action === "apply-distill") {
      const job=unwrapJob(await api(`/api/jobs/${safeId(id)}`)), result=job.result || {};
      openModal("编辑并保存人格","保存到人格库后，可在机器人配置中选择；不会自动替换正在使用的人格。",`<input type="hidden" name="job_id" value="${e(id)}">${field("name","人格名称",result.name || "","text","","required data-full maxlength=\"100\"")}${textarea("prompt","人格正文",result.prompt || result.personality || "","可以在保存前调整。","required rows=\"12\" maxlength=\"6000\"")}`,"apply-distill",null,"保存人格");
    }
    else if (action === "trial-persona") openModal("试聊人格草稿","试聊会调用模型并计入用量，不替换当前人格，也不进入聊天记忆。",`<input type="hidden" name="job_id" value="${e(id)}">${textarea("text","对它说一句话","你好，介绍一下你自己吧","","required maxlength=\"4000\"")}<div id="trial-response" aria-live="polite"></div>`,"trial-persona",null,"发送试聊");
    else if (action === "local-qq") await localQQ();
    else if (action === "select-local-qq") { const form=target.closest("form");$('[name="webui_url"]',form).value=target.dataset.url;$('[name="adapter"]',form).value=target.dataset.adapter; }
    else if (action === "discover-local-qq") { const form=target.closest("form");target.disabled=true;try { const result=await api("/api/qq/local/discover",{method:"POST",body:{}});$("#local-qq-result").innerHTML=connectionResult(result); } finally { target.disabled=false; } }
    else if (action === "computer-settings") { await navigate("settings"); $("#computer-section")?.scrollIntoView({block:"start"}); }
    else if (action === "computer-chat") { if (!state.scope.startsWith("web:")) state.scope=state.scopes.find(item=>item.id.startsWith("web:"))?.id || "web:default";state.chatMode="computer";await navigate("chat"); }
    else if (action === "new-admin") openModal("添加管理员账号","填写连接器提供的真实发送者 ID。官方用户 OpenID 与普通 QQ 号不同。",`<div class="form-grid">${select("platform","账号来源",[["onebot","NapCat / SnowLuma（QQ 号）"],["qqofficial","QQ 官方机器人（OpenID）"]],"onebot","data-full")}${field("account_id","账号 ID","","text","不要填写昵称。","required data-full")}${field("label","显示备注","","text","例如：我的 QQ、小号。","data-full")}${field("instance_id","连接实例（可选）","","text","留空时由服务端按当前连接处理。","data-full")}</div>`,"new-admin",null,"添加管理员");
    else if (action === "remove-admin") await confirmAction("移除这个管理员？","后续电脑操作和任务继续时会重新校验权限。已发生的操作不会撤销。",async()=>{await api(`/api/admins/${safeId(id)}`,{method:"DELETE"});},"移除账号");
    else if (action === "pair-admin" || action === "pair-admin-auto") { pair=await api("/api/admins/pairing",{method:"POST",body:{automatic:action === "pair-admin-auto"}});openModal("绑定我的 QQ","使用目标 QQ 私聊机器人发送下方配对码。60秒快速配对将自动绑定，手动模式需回到此处核对账号。",`<div class="pairing-code">${e("/绑定 " + (pair.code || ""))}</div><p class="help-caption">有效至 ${e(fmt(typeof pair.expires_at === "number" ? pair.expires_at * 1000 : pair.expires_at,true))}。配对码只用于本次绑定。</p>${button("检查绑定消息","check-admin-pairing","primary","refresh")}<div id="pairing-result"></div>`); if(pair.automatic){$("#pairing-result").textContent="配对模式已开启60秒，持码账号私聊发送后将自动成为管理员。请只向自己的账号提供配对码。";pairTimer=setTimeout(pollPairing,1000);} }
    else if (action === "job-resume") {await api(`/api/jobs/${safeId(id)}/resume`,{method:"POST",body:{}});toast("已创建续作任务；已完成的蒸馏分析将按检查点复用。");await bootstrap();}
    else if (action === "runtime-check") {const result=await api("/api/computer/runtimes");openModal("执行环境检查","不会安装组件，也不会运行任务。",notice(result.docker.message,result.docker.available?"":"warning"));}
    else if (action === "check-admin-pairing") { if(!pair?.id)throw new Error("请重新生成配对码。");const result=await api(`/api/admins/pairing/${safeId(pair.id)}`);pair={...pair,...result};const account=result.identity || result.candidate || result.account || result.user;$("#pairing-result").innerHTML=result.status === "bound" ? notice("管理员已绑定，配对码已失效。", "success") : account ? `<div class="local-connector-result"><strong>${e(account.label || account.nickname || "收到配对消息")}</strong><p>${e(account.platform || "qq")} · ${e(account.user_id || account.account_id)}</p>${button("确认添加此管理员","confirm-admin-pairing","primary small","shield")}</div>` : notice(result.message || "尚未收到配对消息，请检查 QQ 连接后重试。", "warning"); }
    else if (action === "confirm-admin-pairing") { if(!pair?.id)throw new Error("请重新生成配对码。");await api(`/api/admins/pairing/${safeId(pair.id)}/confirm`,{method:"POST",body:{}});pair=null;closeModal();toast("QQ 管理员已绑定");await bootstrap(); }
    else if (action === "attachment-options" || action === "upload-note") openModal("上传资料，选择用途","文件解析保存在本机；作为模型参考的选中文本会发送给你配置的模型服务。",`<div class="distill-options"><button class="distill-option" data-action="choose-attachment" data-purpose="context">${icon("file")}<strong>仅本次对话参考</strong><small>作为下一条消息附件，不写入长期记忆。</small></button><button class="distill-option" data-action="choose-attachment" data-purpose="memory">${icon("memory")}<strong>保存为长期资料</strong><small>放入当前会话的可检索资料，之后可编辑或删除。</small></button><button class="distill-option" data-action="distill-corpus">${icon("persona")}<strong>蒸馏人格</strong><small>上传 ZIP，独立分析目标人物，不写入当前记忆。</small></button></div>`);
    else if (action === "choose-attachment") { state.attachmentPurpose=target.dataset.purpose;$("#attachment-input").click(); }
    else if (action === "remove-attachment") { attachments.splice(Number(target.dataset.index),1);$("#attachment-chips").innerHTML=attachmentChips(); }
    else if (action === "list-models") await listModels(target);
    else return false;
    return true;
  }

  async function handleSubmit(kind,form) {
    const data=getForm(form);
    if(data.selected_account) data.account_id=data.selected_account;
    if(kind === "persona-generate") {await api('/api/persona/distill/start',{method:'POST',body:{mode:'generate',name:data.name || undefined,description:data.description}});closeModal();await navigate('jobs');toast('人格生成任务已创建');}
    else if(kind === "profile-bind") {const ids=$$('input[name="scope_ids"]:checked',form).map(x=>x.value);if(!ids.length)throw new Error('请选择要绑定的聊天');await api('/api/bot-profiles/bind',{method:'POST',body:{profile_id:data.profile_id,scope_ids:ids}});closeModal();await bootstrap();toast('已绑定，聊天记录与记忆保留');}
    else if(kind === "bot-profile") {
      const config=state.botProfiles, id=data.id || 'profile_'+Date.now().toString(36);
      const values=Object.fromEntries(['persona_id','model_id','activity','trigger_at','trigger_reply','trigger_name','plan_enabled','proactive_reply','always_reply','allow_tools','allow_mcp','use_persona_knowledge'].map(k=>[k,data[k]]));
      const item={id,name:data.name,values}, items=config.items.some(p=>p.id===id) ? config.items.map(p=>p.id===id?item:p) : [...config.items,item];
      await api('/api/bot-profiles',{method:'PUT',body:{default_id:data.is_default?id:config.default_id,items}});closeModal();await bootstrap();toast('机器人配置已保存');
    }
    else if(kind === "distill-search") { const result=await api("/api/persona/distill/character/search",{method:"POST",body:{work:data.work,character:data.character}});distillDraft={...result,mode:"character",work:data.work,character:data.character};showDistillPreview(); }
    else if(kind === "distill-start") { if(!data.confirmed)throw new Error("请先确认角色或语料范围。");if(!distillDraft)throw new Error("资料预览已过期，请重新开始。");const selected=name=>$$(`input[name="${name}"]:checked`,form).map(item=>item.value);const payload={mode:distillDraft.mode,confirmed:true,name:data.name || undefined};if(payload.mode === "character"){payload.discovery_id=distillDraft.discovery_id;payload.candidate_ids=selected("candidate_ids");payload.version=data.version;if(!payload.candidate_ids.length)throw new Error("至少选择一个已核对的候选。");}else{payload.upload_id=distillDraft.upload_id;payload.target_speaker=data.target_speaker;payload.selected_files=selected("selected_files");if(!payload.selected_files.length)throw new Error("至少选择一个可读取文件。");}await api("/api/persona/distill/start",{method:"POST",body:payload});closeModal();distillDraft=null;await navigate("jobs");toast("蒸馏任务已创建，可以在后台任务中查看进度。"); }
    else if(kind === "apply-distill") { await api(`/api/persona/distill/${safeId(data.job_id)}/apply`,{method:"POST",body:{name:data.name || undefined,prompt:data.prompt}});closeModal();toast("已保存为人格副本，原人格保留。");await bootstrap();await navigate("persona"); }
    else if(kind === "trial-persona") { const result=await api(`/api/persona/distill/${safeId(data.job_id)}/trial`,{method:"POST",body:{text:data.text}});$("#trial-response").innerHTML=`<div class="trial-response">${e(result.reply || result.message || "未返回试聊内容。")}</div>`; }
    else if(kind === "new-admin") { await api("/api/admins",{method:"POST",body:data});closeModal();toast("管理员账号已添加");await bootstrap(); }
    else if(kind === "computer-settings") { await api("/api/settings",{method:"PUT",body:{computer:{enabled:data.enabled,allow_external_tools:!!data.allow_external_tools,runtime:data.runtime || "docker",workspace:data.workspace,approval_mode:data.approval_mode || "automatic",max_steps:Number(data.max_steps),timeout_seconds:Number(data.timeout_seconds),max_output_chars:Number(data.max_output_chars)}}});toast("电脑任务设置已保存");await bootstrap(); }
    else if(kind === "queue-settings") {await api('/api/settings',{method:'PUT',body:{scheduler:Object.fromEntries(['model_concurrency','model_queue_limit','background_queue_limit','scope_queue_limit'].map(k=>[k,Number(data[k])]))}});toast('调度设置已保存');await bootstrap();}
    else if(kind === "job-approval") { await api(`/api/jobs/${safeId(data.job_id)}/approve`,{method:"POST",body:{approval_id:data.approval_id}});closeModal();toast("已批准本次动作，任务继续处理。");await bootstrap(); }
    else if(kind === "local-qq") {
      const result=await api("/api/qq/local/connect",{method:"POST",body:data});
      if(result.requires_account){$("#local-qq-result").innerHTML=notice("连接器中有多个 QQ 账号，请选择一个后再次创建连接。","warning")+select("selected_account","选择 QQ 账号",(result.accounts || []).map(item=>[item.account_id,`${item.label || "QQ"} · ${item.account_id}`]),"","data-full");return true;}
      const status=await api("/api/qq/status");
      $("#local-qq-result").innerHTML=connectionResult({...result,connected:status.connected===true});
      $('[name="password"]',form).value="";
      toast(status.connected ? "QQ 已实际连接" : result.message || "连接配置已写入，请等待实际连接并发送测试消息。");
    }
    else if(kind === "model") { const payload=modelPayload(form);await api("/api/settings",{method:"PUT",body:{model:payload}});const result=$("#model-result",form);if(result)result.innerHTML='<p class="help-caption">配置已保存，正在测试实际连接…</p>';try{const tested=await api("/api/model/test",{method:"POST",body:{}});if(result)result.innerHTML=notice(tested.ok ? `保存并测试成功 · ${tested.latency_ms ?? "—"} ms` : tested.message || "配置已保存，本次连接测试失败。",tested.ok ? "" : "warning");toast(tested.ok ? "已保存并测试模型" : "配置已保存，连接尚未通过",!tested.ok);}catch(error){if(result)result.innerHTML=notice(`配置已保存，测试失败：${error.message}`,"warning");throw error;}state.settings=await api("/api/settings"); }
    else return false;
    return true;
  }

  async function handleChange(target) {
    if(window.MikubotUpdates && await window.MikubotUpdates.handleChange(target))return true;
    if(target.name === "selected_account"){const form=target.closest("form");$('[name="account_id"]',form).value=target.value;return true;}
    if(target.id === "chat-mode"){state.chatMode=target.value;if(target.value === "computer" && !state.settings.computer?.enabled)toast("电脑任务尚未开启，请在机器人设置中开启并指定工作目录。",true);state.draft=$("#chat-text")?.value || state.draft;await renderPage();return true;}
    if(target.id === "corpus-input" && target.files[0]){const file=target.files[0];target.value="";if(file.size>24*1024*1024)throw new Error("ZIP 文件不能超过 24 MB。请减少语料后重试。");const data=new FormData();data.append("file",file);toast("正在识别 ZIP 中的可读文件与说话者…");const result=await api("/api/persona/distill/corpus",{method:"POST",body:data});distillDraft={...result,mode:"corpus"};showDistillPreview();return true;}
    if(target.id === "attachment-input" && target.files[0]){const file=target.files[0];target.value="";if(file.size>8*1024*1024)throw new Error("单份资料不能超过 8 MB。");const purpose=state.attachmentPurpose || "context",data=new FormData();data.append("file",file);data.append("scope_id",state.scope);data.append("purpose",purpose);const result=await api("/api/chat/attachments",{method:"POST",body:data});if(purpose === "context"){const item=result.attachment || result;if(!item.id)throw new Error("附件未返回有效标识，请重新上传。");attachments.push({...item,name:file.name});attachmentScope=state.scope;}closeModal();toast(result.message || (purpose === "memory" ? "已保存为当前会话的长期资料。" : "资料已附加，发送下一条消息时参考。"));await bootstrap();return true;}
    return false;
  }

  function handleInput(target) { const form=target.closest?.('form[data-form="model"],form[data-form="quick-start"],form[data-form="provider"]');if(form && ["base_url","model","api_key","vision"].includes(target.name)){const result=$("#model-result",form);if(result && result.textContent.trim())result.innerHTML='<p class="help-caption">配置已改变，请保存后重新测试。</p>';}}
  function afterRender() { renderedPage=state.page;const job=(state.liveJobs || []).find(item=>!inactive(item) && (state.page !== "chat" || item.scope_id === state.scope));if(["chat","jobs"].includes(state.page))watch(job);else closeStream();if(state.page === "settings"){$$('[data-form="model"] button[type="submit"]').forEach(item=>item.textContent="保存并测试");} }

  // Capture aliases before exported methods are installed; recursion is avoided.
  const originalPersonas = () => globalThis.renderPersonas();
  return {renderOverview,renderChat,sendChat,renderJobs,renderSettings,renderHelp,renderPersonas:async()=>{
    const html=await originalPersonas();return html.replace(button("创造人格","new-persona","primary","plus"),button("直接生成","persona-generate","primary","spark")+button("蒸馏人格","start-distill","","spark")+button("手动创建","new-persona","","plus")).replace('<div class="record-grid">',await profilePanel()+'<h2>人格库</h2><div class="record-grid">');
  },baseSettings:()=>globalThis.renderSettings(),afterRender,handleAction,handleSubmit,handleChange,handleInput,markdown,jobDetail,connectionResult,costLabel,close:()=>{clearTimeout(pairTimer);closeStream();}};
})();
