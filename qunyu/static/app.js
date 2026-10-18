"use strict";

const {scopeModal,identitySection,outputSection,plannerSection,explorationSection,renderPersonaKnowledge,safeKnowledgeURL,explorePersona,renderGroups} = window.MikubotFeatures;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
const e = escapeHTML;
const paths = {
  overview:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  chat:'<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/><path d="M8 10h8M8 14h5"/>',
  memory:'<path d="M12 7v14M3 4h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5v15h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3V4Z"/>',
  culture:'<path d="m4 7 3-3 4 4-3 3-4-4Zm9 6 3-3 4 4-3 3-4-4ZM8 11l5 2M11 8l5 2M3 21l4-1-3-3-1 4ZM18 3l3 3M21 3l-3 3"/>',
  tasks:'<rect x="5" y="4" width="14" height="17" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="m8 13 2 2 5-5"/>',
  tools:'<path d="M8 3v4M16 3v4M6 7h12v4a6 6 0 0 1-12 0V7ZM12 17v4M9 21h6"/>',
  persona:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2M9 8h.01M15 8h.01"/>',
  groups:'<circle cx="9" cy="7" r="3"/><path d="M2 21v-2a7 7 0 0 1 14 0v2M16 4a3 3 0 0 1 0 6M18 14a6 6 0 0 1 4 5v2"/>',
  settings:'<path d="m9 3-.5 3-2.5 1-2.5-1L2 9l2 2v3l-2 2 1.5 3L6 18l2.5 1L9 22h6l.5-3 2.5-1 2.5 1 1.5-3-2-2v-3l2-2-1.5-3L18 7l-2.5-1L15 3H9Z"/><circle cx="12" cy="12.5" r="3"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
  refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-2l2 3M4 16l2 3a7 7 0 0 0 12-2"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  send:'<path d="m22 2-7 20-4-9L2 9 22 2ZM22 2 11 13"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  download:'<path d="M12 3v13m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
  edit:'<path d="m16 3 5 5-12 12-6 1 1-6L16 3ZM14 5l5 5"/>',
  spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
  shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-5"/>',
  link:'<path d="m10 13 4-4M8 16l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0M16 8l2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0" transform="translate(1 0) scale(.92)"/>',
  globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  stop:'<rect x="6" y="6" width="12" height="12" rx="2"/>',
  file:'<path d="M14 2H5v20h14V7l-5-5ZM14 2v6h5M8 12h8M8 16h6"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
const pageNames = {overview:"机器人概览",chat:"聊天",models:"模型供应商",memory:"记忆档案",culture:"群语言与表达",knowledge:"知识与检索",personaKnowledge:"人格知识",tasks:"任务与提醒",tools:"扩展工具",persona:"人格工坊",groups:"群与会话",logs:"运行日志",diagnostics:"自检与诊断",settings:"设置与连接",jobs:"后台任务",help:"使用指南"};
const state = {page:localStorage.getItem("qunyu-page") || "chat",scope:localStorage.getItem("qunyu-scope") || "web:default",boot:null,settings:{},scopes:[],personas:[],records:[],messages:[],filters:{},images:[],draft:"",sending:false,controller:null,renderId:0,modalRecord:null,modalKind:null,authenticated:false};
if (!pageNames[state.page]) state.page = "overview";
const labels = {fact:"事实",preference:"偏好",event:"共同经历",note:"笔记",active:"有效",archived:"已归档",superseded:"已替代",deleted:"已删除",pending:"待处理",approved:"已确认",rejected:"已拒绝",disabled:"已停用",running:"执行中",completed:"已完成",cancelled:"已取消",failed:"失败",private:"仅本人",group:"会话共享",todo:"待办",reminder:"提醒",none:"不重复",daily:"每天",weekly:"每周",balanced:"适时回应",quiet:"仅被提及",active_activity:"积极接话",delivered:"已送达",lexical:"关键词检索",hybrid:"混合检索",semantic:"语义检索",basic:"基础检索"};
const label = key => labels[key] || key || "—";
const fmt = (value, full = false) => { if (!value) return "未设置"; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("zh-CN",full ? {year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"} : {month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}); };
const number = value => Number(value || 0).toLocaleString("zh-CN");
const rows = value => Array.isArray(value) ? value : value?.items || value?.messages || value?.memories || value?.jargon || value?.tasks || value?.events || value?.usage || value?.jobs || value?.admins || value?.candidates || [];
const scope = () => state.scopes.find(item => item.id === state.scope) || {id:state.scope,name:"本地聊天"};
const scopeName = id => state.scopes.find(item => item.id === id)?.name || id || "本地聊天";
const personaName = id => state.personas.find(item => item.id === id)?.name || "默认人格";
function configuredModel(route = "chat") {
  const id = state.settings.routing?.[route];
  if (!id) return state.settings.model || {};
  const model = (state.settings.providers || []).find(item => item.id === id);
  return model?.enabled !== false ? model || {} : {};
}
const query = params => new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== "" && value !== null)).toString();

async function api(path, options = {}) {
  const {method = "GET",body,signal,raw = false} = options;
  const headers = {};
  if (body && !(body instanceof FormData)) headers["Content-Type"] = "application/json";
  const response = await fetch(path,{method,headers,credentials:"same-origin",signal,body:body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body)});
  if (!response.ok) {
    let result; try { result = await response.json(); } catch { result = {}; }
    let detail = result.detail || result.error || `请求失败（${response.status}）`;
    if (typeof detail !== "string") detail = JSON.stringify(detail);
    if (response.status === 401) { state.authenticated = false; showAuth(); }
    throw new Error(detail);
  }
  if (raw) return response;
  if (response.status === 204) return {};
  return response.json();
}

function toast(message,error = false) {
  const item = document.createElement("div"); item.className = `toast${error ? " error" : ""}`;
  item.innerHTML = icon(error ? "info" : "check") + `<span>${e(message)}</span>`;
  $("#toast-region").append(item); setTimeout(() => item.remove(),error ? 8000 : 4200);
}
function heading(eyebrow,title,description,actions = "") { return `<div class="page-heading"><div><div class="eyebrow">${e(eyebrow)}</div><h1>${e(title)}</h1><p>${e(description)}</p></div><div class="heading-actions">${actions}</div></div>`; }
function button(text,action,style = "",symbol = "",attrs = "") { return `<button type="button" class="btn ${style}" data-action="${e(action)}" ${attrs}>${symbol ? icon(symbol) : ""}${e(text)}</button>`; }
function empty(symbol,title,description,action = "",actionText = "") { return `<div class="empty-state"><div class="empty-symbol">${icon(symbol)}</div><h3>${e(title)}</h3><p>${e(description)}</p>${action ? button(actionText,action,"primary","plus") : ""}</div>`; }
function tag(text,type = "") { return `<span class="tag ${type}">${e(text)}</span>`; }
function notice(text,type = "",action = "",actionText = "") { return `<div class="notice ${type}">${icon("info")}<p>${e(text)}</p>${action ? `<button data-action="${e(action)}">${e(actionText)}</button>` : ""}</div>`; }
let fieldId = 0;
function field(name,title,value = "",type = "text",hint = "",extra = "") { const id = `field-${++fieldId}`; return `<div class="field ${extra.includes("data-full") ? "full" : ""}"><label for="${id}">${e(title)}</label><input id="${id}" name="${e(name)}" type="${e(type)}" value="${type === "password" ? "" : e(value)}" ${hint ? `aria-describedby="${id}-help"` : ""} ${extra}>${hint ? `<small id="${id}-help">${e(hint)}</small>` : ""}</div>`; }
function textarea(name,title,value = "",hint = "",extra = "") { const id = `field-${++fieldId}`; return `<div class="field full"><label for="${id}">${e(title)}</label><textarea id="${id}" name="${e(name)}" ${hint ? `aria-describedby="${id}-help"` : ""} ${extra}>${e(value)}</textarea>${hint ? `<small id="${id}-help">${e(hint)}</small>` : ""}</div>`; }
function select(name,title,options,value,extra = "") { const id = `field-${++fieldId}`; return `<div class="field ${extra.includes("data-full") ? "full" : ""}"><label for="${id}">${e(title)}</label><select id="${id}" name="${e(name)}" ${extra}>${options.map(item => { const [key,text] = Array.isArray(item) ? item : [item,label(item)]; return `<option value="${e(key)}" ${String(value) === String(key) ? "selected" : ""}>${e(text)}</option>`; }).join("")}</select></div>`; }
function toggle(name,title,hint,checked) { return `<div class="toggle-field"><div class="toggle-copy"><strong>${e(title)}</strong><small>${e(hint)}</small></div><label class="switch"><input type="checkbox" name="${e(name)}" aria-label="${e(title)}" ${checked ? "checked" : ""}><span></span></label></div>`; }
function scopesField(value = state.scope) { return select("scope_id","生效会话",state.scopes.map(item => [item.id,item.name]),value,"data-full"); }
function getForm(form) { const values = Object.fromEntries(new FormData(form)); $$('input[type="checkbox"]',form).forEach(item => { values[item.name] = item.checked; }); return values; }
function listToolbar(placeholder,options) { return `<div class="toolbar"><label class="search-field">${icon("search")}<input type="search" id="record-search" value="${e(state.filters.q || "")}" placeholder="${e(placeholder)}" aria-label="搜索"></label><div class="filter-tabs">${options.map(([key,text]) => `<button class="filter-tab ${ (state.filters.status || "") === key ? "active" : ""}" data-action="filter" data-status="${e(key)}">${e(text)}</button>`).join("")}</div></div>`; }

function renderNavigation() {
  const top = [["chat","聊天"],["overview","机器人管理"]];
  const management = Object.entries(pageNames).filter(([key]) => !["chat","overview","help"].includes(key));
  const nav = (key,name) => `<button class="nav-item ${state.page === key ? "active" : ""}" data-page="${key}" ${state.page === key ? 'aria-current="page"' : ""}>${icon(key === "knowledge" ? "file" : key === "diagnostics" ? "shield" : key === "jobs" ? "tasks" : key)}<span>${name}</span></button>`;
  $("#navigation").innerHTML = `<div class="primary-navigation">${top.map(([key,name]) => nav(key,name)).join("")}</div><details class="management-navigation" ${state.page !== "chat" ? "open" : ""}><summary>管理功能</summary>${management.map(([key,name]) => nav(key,name)).join("")}</details>`;
  document.body.classList.toggle("chat-page",state.page === "chat");
  $("#page-breadcrumb").textContent = pageNames[state.page];
  $("#scope-icon").innerHTML = icon("groups");
  $("#refresh-button").innerHTML = icon("refresh");
  $("#global-scope").innerHTML = state.scopes.map(item => `<option value="${e(item.id)}" ${item.id === state.scope ? "selected" : ""}>${e(item.name)}</option>`).join("");
  const modelReady = !state.boot?.setup_required;
  $("#sidebar-status-dot").className = `status-dot ${state.settings.paused ? "warning" : modelReady ? "online" : ""}`;
  $("#sidebar-status-text").textContent = state.settings.paused ? "已暂停自动回复" : modelReady ? "本地服务已就绪" : "等待配置模型";
  $("#sidebar-status-sub").textContent = modelReady ? (configuredModel().model || "你的数据，留在你的电脑") : "连接模型即可开始聊天";
  $("#version-label").textContent = state.boot?.version || "0.1";
  $("#workspace-version").textContent = state.boot?.version || "0.2";
}
async function bootstrap(showWizard = false) {
  const boot = await api("/api/bootstrap");
  state.boot = boot; state.settings = boot.settings || {}; state.scopes = boot.scopes || []; state.personas = boot.personas || [];
  if (!state.scopes.find(item => item.id === state.scope)) state.scope = state.scopes[0]?.id || "web:default";
  state.authenticated = true; renderNavigation(); await renderPage();
  if (showWizard && boot.setup_required && !sessionStorage.getItem("qunyu-wizard-skipped")) showWizardModal();
}
async function navigate(page) {
  if (!pageNames[page]) return;
  if (state.page === "chat") state.draft = $("#chat-text")?.value || state.draft;
  state.page = page; state.filters = {}; localStorage.setItem("qunyu-page",page);
  $("#sidebar").classList.remove("open"); $("#sidebar-scrim").classList.remove("open");
  renderNavigation(); await renderPage(); window.scrollTo(0,0);
}
async function renderPage() {
  const id = ++state.renderId;
  const main = $("#content");
  main.innerHTML = '<div class="loading-page"><span class="spinner"></span><p>正在读取本地数据…</p></div>';
  try {
    const html = await ({overview:window.MikubotExperience.renderOverview,chat:window.MikubotExperience.renderChat,models:window.MikubotPages.renderModels,logs:window.MikubotPages.renderLogs,memory:renderMemory,culture:renderCulture,knowledge:renderKnowledge,personaKnowledge:renderPersonaKnowledge,tasks:renderTasks,tools:renderTools,persona:window.MikubotExperience.renderPersonas,groups:renderGroups,diagnostics:renderDiagnostics,settings:window.MikubotExperience.renderSettings,jobs:window.MikubotExperience.renderJobs,help:window.MikubotExperience.renderHelp}[state.page])();
    if (id !== state.renderId) return;
    main.innerHTML = `<div class="animate-in">${html}</div>`;
    if (state.page === "chat") { const feed = $("#chat-feed"); feed.scrollTop = feed.scrollHeight; renderImagePreviews(); }
    if (state.page === "settings") updateAdapterFields();
    window.MikubotExperience.afterRender();
    window.MikubotPages.afterRender();
  } catch (error) { if (id === state.renderId) main.innerHTML = `${heading("LOCAL WORKSPACE",pageNames[state.page],"数据暂时没有加载成功。请确认本地服务仍在运行。") }<div class="inline-error">${e(error.message)}</div><div class="section-actions">${button("重新加载","refresh","primary","refresh")}</div>`; }
}

async function renderOverviewBase() {
  const [events,tasks] = await Promise.all([api("/api/events"),api(`/api/tasks?${query({scope_id:state.scope})}`)]);
  const stats = state.boot?.stats || {}, pending = rows(tasks).filter(item => ["pending","running"].includes(item.status));
  const ready = !state.boot?.setup_required, qq = state.boot?.qq || {}, connected = qq.connected === true || qq.status === "connected";
  const heroText = ready ? "一个会记住你、懂得接话，也能把事情做好的群友。从一句问候开始，让共同经历慢慢生长。" : "先为mikubot连接一个语言模型。记忆、群词典与待办已经就绪，只差第一次真正的对话。";
  const cards = [["chat","累计对话",stats.messages,"每一条交流，都有回声"],["memory","有效记忆",stats.memories,"值得记住的，慢慢积累"],["culture","群词典",stats.jargon,"属于你们的语言默契"],["tasks","待办与提醒",pending.length,"交代的事，放在心上"]];
  return heading("MIKUBOT","你好，欢迎回到mikubot。","双击启动后，按三步完成称呼、模型和 QQ 设置。",button("快速入门","setup","","arrow")) + `<section class="hero"><div class="hero-copy"><div class="eyebrow">CONVERSATION · MEMORY · COMPANIONSHIP</div><h2>聊得自然，记得认真。</h2><p>${e(heroText)}</p><div class="hero-actions">${button(ready ? "开始一段对话" : "连接我的模型",ready ? "go-chat" : "setup","light","arrow")}<button class="hero-link" data-page="memory">看看记忆档案 ↗</button></div></div><div class="hero-art" aria-hidden="true"><div class="orbit"></div><div class="orbit two"></div><div class="orb"></div><span class="star">✳</span><div class="island"></div><div class="island two"></div><div class="island three"></div></div></section><div class="stats-grid">${cards.map(([symbol,title,value,foot]) => `<div class="stat-card"><div class="stat-top"><span>${title}</span><span class="stat-icon">${icon(symbol)}</span></div><div class="stat-number">${number(value)}</div><div class="stat-foot">${foot}</div></div>`).join("")}</div><div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><div class="panel-kicker">GETTING STARTED</div><h2>三步快速入门</h2><p>各步可以跳过，之后随时继续。</p></div>${tag(ready ? "已迈出第一步" : "等待启程",ready ? "" : "gold")}</div><div class="panel-body">${[[true,"01","认识机器人",state.settings.identity?.name || "初音未来","setup","改称呼"],[ready,"02","连接语言模型",ready ? configuredModel().model : "也可先跳过，使用本地记事与待办","quick-model",ready ? "管理" : "去连接"],[connected,"03","带它加入 QQ","NapCat、SnowLuma 或 QQ 官方机器人","quick-qq",connected ? "管理" : "去连接"]].map(([done,no,title,sub,action,text]) => `<div class="onboarding-item"><span class="step-number ${done ? "done" : ""}">${done ? "✓" : no}</span><div class="step-content"><strong>${e(title)}</strong><p>${e(sub || "尚未设置")}</p></div><button data-action="${action}">${text} →</button></div>`).join("")}</div></section><section class="panel"><div class="panel-head"><div><div class="panel-kicker">ISLAND ACTIVITY</div><h2>运行动态</h2></div><button class="panel-head-link" data-page="settings">查看运行记录 ↗</button></div><div class="panel-body">${rows(events).length ? rows(events).slice(0,5).map(item => `<div class="activity-item"><span class="activity-dot"></span><div class="activity-copy"><strong>${e(item.message || item.kind)}</strong><p>${e(item.kind || "运行记录")}</p></div><span class="activity-time">${e(fmt(item.created_at))}</span></div>`).join("") : empty("spark","尚无运行记录","配置模型后发送第一条消息，运行动态会出现在这里。")}</div></section></div>`;
}

function imageURL(value) {
  const url = typeof value === "string" ? value : value?.url || value?.image_url?.url || "";
  return /^(data:image\/(?:png|jpeg|webp|gif);base64,|https?:\/\/|\/(?!\/))/i.test(url) ? url : "";
}
function messageImage(url) {
  return /^https?:\/\//i.test(url) ? `<a class="image-external-link" href="${e(url)}" target="_blank" rel="noopener noreferrer">${icon("image")}查看外部图片 ↗</a>` : `<img src="${e(url)}" alt="对话附图" loading="lazy" data-action="view-image">`;
}
function renderMessageBase(item) {
  const user = item.role === "user", metadata = item.metadata || {}, images = metadata.images || item.images || [];
  const references = metadata.memories || metadata.memory_ids || metadata.references || Object.keys(metadata.memory_versions || {}), jargon = metadata.jargon || metadata.jargon_ids || Object.keys(metadata.jargon_versions || {});
  return `<article class="message ${user ? "user" : "assistant"}"><div class="message-avatar">${user ? "你" : "ミ"}</div><div class="message-body"><div class="message-label"><span>${user ? e((item.scope_id || state.scope).startsWith("web:") && item.user_id === "owner" ? "mikubot" : metadata.nickname || item.user_id || "你") : e(personaName(scope().persona_id))}</span><span>${e(fmt(item.created_at))}</span></div>${item.content ? `<div class="message-content">${e(item.content)}</div>` : ""}${images.length ? `<div class="message-images">${images.map(imageURL).filter(Boolean).map(url => messageImage(url)).join("")}</div>` : ""}${references.length || jargon.length ? `<div class="message-references">${references.length ? `<button class="reference-button" data-action="message-sources" data-id="${e(item.id)}">参考 ${references.length} 条记忆 ↗</button>` : ""}${jargon.length ? `<button class="reference-button" data-action="message-sources" data-id="${e(item.id)}">理解 ${jargon.length} 个群词 ↗</button>` : ""}</div>` : ""}</div></article>`;
}
async function renderChatBase() {
  const isWeb = state.scope.startsWith("web:");
  state.messages = rows(await api(`/api/messages?${query({scope_id:state.scope})}`));
  const configNotice = state.boot?.setup_required ? notice("还没有连接语言模型。你可以先试试“记住：我喜欢抹茶”“添加待办：周末买咖啡豆”等本地命令。","warning","setup","连接模型") : "";
  return heading("A PLACE TO TALK","从一句话开始。","陪你闲聊，也认真接住每一件小事。",button("导入笔记","upload-note","","upload")) + configNotice + `<div class="chat-layout"><div class="chat-top"><div class="chat-identity"><div class="chat-avatar">✳</div><div><h3>${e(personaName(scope().persona_id))}</h3><p>${e(scope().name)} · ${isWeb ? "本地对话空间" : "QQ 历史记录"}</p></div></div><div class="inline-stack">${button("清空记录","clear-messages","ghost small","trash")}${button("人格","go-persona","small","persona")}</div></div>${!isWeb ? '<div class="chat-scope-note scope-warning">这里可以查看 QQ 会话记录。发送消息请切换到「本地聊天」，避免意外向群里发信。</div>' : ""}<div class="chat-feed" id="chat-feed">${state.messages.length ? state.messages.map(renderMessage).join("") : `<div class="empty-state"><div class="chat-welcome-glyph">✳</div><h3>见到你很开心。</h3><p>说说今天的事，或把想记住、想完成的事情交给我。</p>${isWeb ? '<div class="chat-suggestions"><button data-action="chat-suggestion" data-text="你好，介绍一下你自己吧">认识一下你</button><button data-action="chat-suggestion" data-text="记住：我喜欢喝抹茶">记住我的偏好</button><button data-action="chat-suggestion" data-text="添加待办：周末买咖啡豆">添加一件待办</button></div>' : ""}</div>`}${state.sending ? '<div class="pending-message"><span class="spinner small"></span>正在认真听，也在想…</div>' : ""}</div><form class="chat-composer" data-form="chat"><div class="image-previews" id="image-previews"></div><textarea id="chat-text" name="text" placeholder="${isWeb ? "把想说的话，放在这里…" : "请切换到本地聊天后发送消息"}" aria-label="发送消息" rows="2" ${!isWeb || state.sending ? "disabled" : ""}>${e(state.draft)}</textarea><div class="composer-bottom"><div class="composer-tools"><button class="icon-button" type="button" data-action="attach-image" title="添加图片" aria-label="添加图片" ${!isWeb || state.sending ? "disabled" : ""}>${icon("image")}</button><button class="icon-button" type="button" data-action="upload-note" title="导入文本笔记" aria-label="导入文本笔记">${icon("file")}</button><span class="composer-hint">Enter 发送 · Shift + Enter 换行</span></div>${state.sending ? button("停止等待","cancel-chat","small","stop") : `<button class="btn primary" type="submit" ${!isWeb ? "disabled" : ""}>发送 ${icon("send")}</button>`}</div></form></div><p class="help-caption">${e(state.boot?.capabilities?.vision ? "当前模型已启用图片理解。" : "发送图片前，请在设置中启用模型的视觉能力。")} 记忆与群词典按会话隔离，可随时纠正或删除。</p>`;
}
function renderImagePreviews() {
  if (!$("#image-previews")) return;
  $("#image-previews").innerHTML = state.images.map((item,index) => `<div class="image-preview"><img src="${e(item.data)}" alt="${e(item.name)}"><button type="button" data-action="remove-image" data-index="${index}" aria-label="移除${e(item.name)}">×</button></div>`).join("");
}
async function sendChat(form) {
  if (state.sending || !state.scope.startsWith("web:")) return;
  const text = $("#chat-text").value.trim();
  if (!text && !state.images.length) return;
  const images = state.images.map(item => item.data);
  state.draft = text; state.sending = true; state.controller = new AbortController();
  const controller = state.controller;
  await renderPage();
  try {
    const response = await api("/api/chat",{method:"POST",body:{scope_id:state.scope,text,images},signal:controller.signal});
    state.draft = ""; state.images = [];
    if (response.pending_actions?.length) { state.pendingToolNotice = {scope_id:state.scope,count:response.pending_actions.length}; toast(`有 ${response.pending_actions.length} 项扩展工具调用等待你审批，尚未执行。`); }
    if (response.memories?.length) toast(`已参考 ${response.memories.length} 条记忆`);
  } catch (error) { toast(error.name === "AbortError" ? "已停止等待；后台可能仍在处理，请刷新记录确认。" : error.message,error.name !== "AbortError"); }
  finally { state.sending = false; state.controller = null; await bootstrap(); if (state.page === "chat") $("#chat-text")?.focus(); }
}

async function renderChat() {
  const html = await renderChatBase(), pending = state.pendingToolNotice;
  if (!pending || pending.scope_id !== state.scope) return html;
  return html.replace('<div class="chat-layout">',`${notice(`刚才提出了 ${pending.count} 项扩展工具请求，请前往审批页查看当前状态。批准前不会执行，批准结果仅在本地查看。`,"warning","go-tools","查看工具请求")}<div class="chat-layout">`);
}

async function renderMemoryBase() {
  state.records = rows(await api(`/api/memories?${query({scope_id:state.scope,q:state.filters.q,status:state.filters.status})}`));
  return heading("LITTLE THINGS, WELL REMEMBERED","记忆档案","事实、偏好与共同经历，都有出处，也能被纠正。",button("导入笔记","upload-note","","upload") + button("记住一件事","new-memory","primary","plus")) + listToolbar("搜索内容、人物或关键词",[["","全部"],["active","有效"],["archived","归档"],["superseded","已替代"]]) + notice("当前会话的记忆只在这个空间召回。纠正内容会更新版本；归档后不再参与回答。") + (state.records.length ? `<div class="record-grid">${state.records.map(item => `<article class="record-card"><div class="record-card-head"><div class="inline-stack">${tag(label(item.kind))}${item.pinned ? tag("长期保留","gold") : ""}</div>${tag(label(item.status),item.status === "active" ? "" : "gray")}</div>${item.subject ? `<h3 style="font-size:12px;margin-bottom:8px">${e(item.subject)}</h3>` : ""}<p class="record-text">${e(item.content)}</p><div class="record-meta"><span>${iconInline("persona")}${e(item.user_id || "owner")}</span><span>${e(label(item.visibility))}</span><span>v${e(item.version || 1)} · ${e(fmt(item.updated_at || item.created_at))}</span></div><div class="record-actions">${button("详情 / 来源","memory-detail","ghost small","",`data-id="${e(item.id)}"`)}${button("纠正","edit-memory","small","edit",`data-id="${e(item.id)}"`)}${button(item.status === "archived" ? "恢复" : "归档","archive-memory","ghost small","",`data-id="${e(item.id)}"`)}<button class="icon-button push-right" data-action="delete-memory" data-id="${e(item.id)}" aria-label="删除记忆">${icon("trash")}</button></div></article>`).join("")}</div>` : empty("memory","值得记住的事，还在路上","告诉它你的偏好，或在这里手动添加一段记忆。也可以导入 TXT / Markdown 笔记。","new-memory","添加第一条记忆"));
}
function iconInline(name) { return `<span class="inline-icon" style="display:inline-block;vertical-align:middle;margin-right:4px;width:11px;height:11px">${icon(name)}</span>`; }
async function renderCultureBase() {
  state.records = rows(await api(`/api/jargon?${query({scope_id:state.scope,q:state.filters.q,status:state.filters.status})}`));
  return heading("OUR SHARED LANGUAGE","你们懂的，它也懂。","收集黑话、别名与群梗，让它慢慢融入你们的聊天。",button("教一个新词","new-jargon","primary","plus")) + listToolbar("搜索词语、含义或话题",[["","全部"],["approved","已确认"],["pending","待确认"],["disabled","已停用"],["rejected","已拒绝"]]) + notice("同一个词可以有多个意思。只有已确认的词条参与理解；是否主动使用可以单独设置。") + (state.records.length ? `<div class="record-grid">${state.records.map(item => `<article class="record-card"><div class="record-card-head"><h3>${e(item.term)}</h3>${tag(label(item.status),item.status === "pending" ? "gold" : item.status === "approved" ? "" : "gray")}</div><p class="record-text">${e(item.meaning)}</p>${item.example ? `<div class="persona-preview">${e(item.example)}</div>` : ""}<div class="record-meta">${item.topic ? `<span>话题 · ${e(item.topic)}</span>` : ""}<span>${item.use_allowed ? "允许主动使用" : "只用于理解"}</span><span>v${e(item.version || 1)}</span></div><div class="record-actions">${item.status === "pending" ? button("确认词义","approve-jargon","primary small","check",`data-id="${e(item.id)}"`) + button("拒绝","reject-jargon","ghost small","",`data-id="${e(item.id)}"`) : ""}${button("编辑","edit-jargon","small","edit",`data-id="${e(item.id)}"`)}${item.status === "approved" || item.status === "disabled" ? button(item.status === "disabled" ? "启用" : "停用","toggle-jargon","ghost small","",`data-id="${e(item.id)}"`) : ""}<button class="icon-button push-right" data-action="delete-jargon" data-id="${e(item.id)}" aria-label="删除词条">${icon("trash")}</button></div></article>`).join("")}</div>` : empty("culture","每个群都有自己的语言","从一个缩写、昵称或梗开始。填入词义与例句，让它在正确的场合听懂你们。","new-jargon","教会它第一个词"));
}
async function renderTasks() {
  state.records = rows(await api(`/api/tasks?${query({scope_id:state.scope,status:state.filters.status})}`));
  if (state.filters.q) state.records = state.records.filter(item => item.title?.includes(state.filters.q));
  return heading("SMALL PROMISES, KEPT","交代的事，放在心上。","安排提醒、记录待办，随时查看每一件事的结果。",button("添加任务","new-task","primary","plus")) + listToolbar("搜索任务",[["","全部"],["pending","待处理"],["completed","已完成"],["failed","失败"],["cancelled","已取消"]]) + notice("提醒需要mikubot保持运行。电脑睡眠或关机期间无法送达；QQ 提醒需要连接在线。") + (state.records.length ? `<div class="task-list">${state.records.map(item => `<article class="task-card"><div class="task-symbol">${icon(item.kind === "reminder" ? "clock" : "tasks")}</div><div class="task-main"><h3>${e(item.title)}</h3><div class="record-meta"><span>${e(label(item.kind))}</span>${item.due_at ? `<span>${e(fmt(item.due_at,true))}</span>` : ""}${item.repeat && item.repeat !== "none" ? `<span>${e(label(item.repeat))}</span>` : ""}<span>${e(scopeName(item.scope_id))}</span></div>${item.error || item.result ? `<p class="task-extra">${e(item.error || (typeof item.result === "string" ? item.result : JSON.stringify(item.result)))}</p>` : ""}</div>${tag(label(item.status),item.status === "failed" ? "red" : item.status === "completed" ? "" : "gray")}<div class="record-actions">${item.kind === "todo" && item.status === "pending" ? button("完成","complete-task","small","check",`data-id="${e(item.id)}"`) : ""}${item.status === "pending" ? button("修改","edit-task","ghost small","edit",`data-id="${e(item.id)}"`) : ""}${["failed","cancelled"].includes(item.status) ? button("重试","retry-task","small","refresh",`data-id="${e(item.id)}"`) : ""}${["pending","running"].includes(item.status) ? button("取消","cancel-task","ghost small","",`data-id="${e(item.id)}"`) : ""}</div></article>`).join("")}</div>` : empty("tasks","今天，还没有交代的事","安排一个提醒，或把待办留在这里。时间到了，它会在对应的会话提醒你。","new-task","添加第一件事"));
}
async function renderPersonas() {
  state.personas = rows(await api("/api/personas"));
  return heading("A CHARACTER OF ITS OWN","让它，有自己的样子。","温柔、活泼，或少说多做。为每个会话选择合适的性格。",button("创造人格","new-persona","primary","plus")) + `<div class="record-grid">${state.personas.map(item => `<article class="record-card persona-card"><div class="record-card-head"><div><div class="persona-badge" style="color:${/^#[0-9a-f]{6}$/i.test(item.color || "") ? e(item.color) : "#7e9565"}">✳</div><h3>${e(item.name)}</h3></div>${scope().persona_id === item.id ? tag("当前会话使用") : ""}</div><p class="record-text">${e(item.description || "还没有写下人格介绍。")}</p><div class="persona-preview">${e(item.system_prompt || "尚未设置人格提示词")}</div><div class="record-actions">${button("用于当前会话","use-persona","primary small","",`data-id="${e(item.id)}" ${scope().persona_id === item.id ? "disabled" : ""}`)}${button("编辑人格","edit-persona","small","edit",`data-id="${e(item.id)}"`)}${item.id !== "default" ? `<button class="icon-button push-right" data-action="delete-persona" data-id="${e(item.id)}" aria-label="删除人格">${icon("trash")}</button>` : ""}</div></article>`).join("")}</div><p class="help-caption">人格负责表达方式；记忆和群词典按会话保存。切换人格不会清空共同经历。</p>`;
}
function settingsModelForm(model = {},wizard = false) {
  return `<div class="form-grid">${field("base_url","API 地址",model.base_url || "https://api.openai.com/v1","url","填写兼容 OpenAI Chat Completions 的服务地址。","required data-full placeholder=\"https://…/v1\"")}${field("api_key","API 密钥","","password",model.api_key_set ? "已保存密钥。留空可继续使用当前密钥。" : "密钥只保存在本机，不会在页面中回显。","autocomplete=\"new-password\" data-full placeholder=\"sk-…\"")}${field("model","模型名称",model.model || "","text","与服务商提供的名称一致。","required data-full placeholder=\"输入模型名称\" list=\"model-list\"")}<datalist id="model-list"></datalist>${!wizard ? field("temperature","对话温度",model.temperature ?? .7,"number","越低越稳定，越高表达越灵活。","step=\"0.1\" min=\"0\" max=\"2\"") : ""}${!wizard ? field("input_price","输入价格 / 百万 Token",model.input_price || 0,"number","填写人民币价格，用于本地费用估算。","min=\"0\" step=\"0.01\"") + field("output_price","输出价格 / 百万 Token",model.output_price || 0,"number","未配置单价时显示费用未知；实际账单以服务商为准。","min=\"0\" step=\"0.01\"") : ""}</div>${toggle("vision","启用图片理解","仅当所选模型支持图片时开启。",model.vision)}`;
}
async function renderSettingsBase() {
  const [settings,qq,events,usage,system] = await Promise.all([api("/api/settings"),api("/api/qq/status"),api("/api/events"),api("/api/usage"),api("/api/system")]);
  state.settings = settings; const model = settings.model || {}, onebot = settings.onebot || {}, official = settings.qq_official || {}, budget = settings.budget || {};
  const adapter = onebot.adapter || "napcat", connected = qq.connected === true || qq.status === "connected";
  return heading("MAKE YOURSELF AT HOME","设置与连接","连接模型与 QQ，管理预算，也照顾好本地数据。") + `<div class="settings-layout"><div class="settings-main"><section class="panel settings-section" id="model-section"><div class="section-title"><span>${icon("spark")}</span><div><h2>语言模型</h2><p>一套模型配置，让对话、记忆与工具一起工作。</p></div>${tag(model.model ? "已配置" : "待连接",model.model ? "" : "gold")}</div><form data-form="model">${settingsModelForm(model)}<div class="section-actions"><button class="btn primary" type="submit">保存配置</button>${button("测试连接","test-model","","link")}${button("读取模型列表","list-models","ghost","refresh")}</div><div id="model-result" aria-live="polite"></div></form></section><section class="panel settings-section" id="qq-section"><div class="section-title"><span>${icon("groups")}</span><div><h2>QQ 接入</h2><p>选择适合你的连接方式，完成登录后再启用。</p></div>${tag(connected ? "已连接" : "未连接",connected ? "" : "gray")}</div><form data-form="qq"><div class="form-grid">${select("adapter","接入方式",[["napcat","NapCat · OneBot v11"],["snowluma","SnowLuma · OneBot v11"],["official","QQ 官方机器人"]],adapter,"data-full")}</div><div id="onebot-fields"><div class="help-caption" id="adapter-guide"></div>${toggle("enabled","启用 QQ 连接","仅处理白名单中的会话。",onebot.enabled)}<div class="form-grid">${field("ws_url","正向 WebSocket 地址（可选）",onebot.ws_url || "","url","留空时使用反向 WebSocket 接入。","data-full placeholder=\"ws://127.0.0.1:3001\"")}${field("onebot_max_message_chars","OneBot 单条长度保护",onebot.max_message_chars ?? 0,"number","0 继承全局发送长度保护；本机保护值并非平台承诺。","data-full min=\"0\" max=\"20000\"")}${field("access_token","OneBot Access Token","","password",onebot.access_token_set ? "已保存，留空保持原值。" : "与 QQ 连接器中配置的 Token 一致。","data-full autocomplete=\"new-password\"")}${textarea("owner_ids","允许私聊的 QQ 号",(onebot.allowed_users || onebot.owner_ids || []).join("\n"),"每行一个。这些账号可以私聊机器人；电脑任务另由管理员列表授权。","placeholder=\"123456789\"")}${textarea("allowed_groups","允许的 QQ 群号",(onebot.allowed_groups || []).join("\n"),"每行一个，未列出的群不处理。","placeholder=\"987654321\"")}</div><div class="code-block">反向 WebSocket 地址：\n${e((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/onebot/v11/ws")}</div><div class="section-actions"><button class="btn primary" type="submit">保存接入配置</button>${button("重新连接","qq-reconnect","","refresh")}</div></div><div id="official-fields"><p class="help-caption">在 QQ 开放平台创建机器人，使用 AppID 与 AppSecret。官方权限、可用场景及审核要求以平台为准。</p>${toggle("official_enabled","启用 QQ 官方机器人","使用官方接口接收与发送消息。",official.enabled)}<div class="form-grid">${field("app_id","AppID",official.app_id || "","text","QQ 开放平台的应用 ID。","data-full")}${field("official_max_message_chars","官方通道单条长度保护",official.max_message_chars ?? 0,"number","0 继承全局发送长度保护。","data-full min=\"0\" max=\"20000\"")}${field("app_secret","AppSecret","","password",official.app_secret_set ? "已保存，留空保持原值。" : "仅保存在本机，不回显。","data-full autocomplete=\"new-password\"")}${textarea("official_allowed_groups","允许的群 OpenID",(official.allowed_groups || []).join("\n"),"填写官方事件中的群 OpenID，每行一个，并非普通 QQ 群号。")}${textarea("allowed_users","允许的用户 OpenID",(official.allowed_users || []).join("\n"),"填写官方事件中的用户 OpenID，每行一个，并非普通 QQ 号。")}</div><div class="section-actions"><button class="btn primary" type="submit">保存接入配置</button>${button("验证官方凭据","test-official","","shield")}${button("重新连接","qq-reconnect","ghost","refresh")}</div></div><div id="qq-result" aria-live="polite"></div></form><details class="details"><summary>查看连接状态与接入提示</summary><div class="code-block">${e(JSON.stringify(qq,null,2))}</div><p class="help-caption">连接器运行后，先在「群与会话」配置对应会话。可分别开启 @、回复、名称触发，并为每个会话配置 Planner 与主动接话。NapCat 与 SnowLuma 需独立安装并完成 QQ 登录。</p><p class="help-caption"><a href="https://napneko.github.io/" target="_blank" rel="noopener noreferrer">NapCat 文档 ↗</a> · <a href="https://snowluma.github.io/" target="_blank" rel="noopener noreferrer">SnowLuma 文档 ↗</a> · <a href="https://q.qq.com/" target="_blank" rel="noopener noreferrer">QQ 开放平台 ↗</a></p></details></section><section class="panel settings-section"><div class="section-title"><span>${icon("shield")}</span><div><h2>预算与运行</h2><p>费用按填写的单价估算，实际账单以服务商为准。</p></div></div><form data-form="budget"><div class="form-grid">${field("daily_tokens","每日 Token 上限",budget.daily_tokens || 0,"number","0 表示不限。输入与输出 Token 合计。","min=\"0\" step=\"1\"")}${field("daily_cost","每日费用上限（元）",budget.daily_cost || 0,"number","0 表示不限；需要先填写模型单价。","min=\"0\" step=\"0.01\"")}</div>${toggle("paused","暂停自动回复","暂停后保留管理能力，适合维护与恢复期间。",settings.paused)}<div class="section-actions"><button class="btn primary" type="submit">保存预算与运行设置</button></div></form>${system.supported ? `<form data-form="system">${toggle("autostart","登录 Windows 后启动mikubot","登录后在托盘运行，默认不开启。",system.autostart)}<div class="section-actions"><button class="btn" type="submit">保存开机启动设置</button></div></form>` : ""}</section><section class="panel settings-section"><div class="section-title"><span>${icon("memory")}</span><div><h2>备份与恢复</h2><p>把共同经历妥善保存。</p></div></div><p class="help-caption" style="margin-top:0">备份包含数据库与设置，不包含模型、OneBot 和官方机器人密钥。恢复会替换现有数据并暂停回复，之后请重新填写密钥。</p><div class="section-actions">${button("下载备份","download-backup","","download")}${button("从备份恢复","restore-backup","ghost","upload")}${button("退出mikubot","shutdown","ghost","stop")}</div></section><section class="panel settings-section"><div class="section-title"><span>${icon("clock")}</span><div><h2>最近用量与运行记录</h2><p>只展示真实记录，不填充演示数据。</p></div></div>${rows(usage).length ? `<div style="overflow:auto"><table class="usage-table"><thead><tr><th>时间</th><th>模型</th><th>输入</th><th>输出</th><th>费用</th></tr></thead><tbody>${rows(usage).slice(0,15).map(item => `<tr><td>${e(fmt(item.created_at))}</td><td>${e(item.model || "—")}</td><td>${number(item.input_tokens)}</td><td>${number(item.output_tokens)}</td><td>${window.MikubotExperience.costLabel(item)}</td></tr>`).join("")}</tbody></table></div>` : '<p class="help-caption">还没有模型调用记录。发送第一条消息后，用量会出现在这里。</p>'}<details class="details"><summary>查看运行记录（${rows(events).length}）</summary><div class="event-list">${rows(events).slice(0,30).map(item => `<div class="activity-item"><span class="activity-dot"></span><div class="activity-copy"><strong>${e(item.message || item.kind)}</strong><p>${e(item.kind)}</p></div><span class="activity-time">${e(fmt(item.created_at))}</span></div>`).join("") || '<p class="help-caption">暂无运行记录。</p>'}</div></details></section></div><aside class="settings-aside"><section class="panel"><div class="panel-head"><h2>运行状态</h2></div><div class="panel-body"><div class="connection-badge"><span class="status-dot ${state.boot?.setup_required ? "" : "online"}"></span>${state.boot?.setup_required ? "等待配置语言模型" : "本地服务正常运行"}</div><div class="info-pair"><span>版本</span><strong>${e(state.boot?.version || "0.1")}</strong></div><div class="info-pair"><span>QQ 接入</span><strong>${connected ? "在线" : "离线"}</strong></div><div class="info-pair"><span>今日估算费用</span><strong>${window.MikubotExperience.costLabel({cost:state.boot?.stats?.cost_today,cost_known:state.boot?.stats?.cost_known_today})}</strong></div><div class="info-pair"><span>会话空间</span><strong>${state.scopes.length} 个</strong></div></div></section><section class="panel"><div class="panel-head"><h2>第一次配置？</h2></div><div class="panel-body"><ol class="guide-list"><li>确认机器人的名称与别名，默认初音未来。</li><li>填写并测试模型，或先跳过使用本地功能。</li><li>选择 QQ 接入方式并填写允许回复的聊天。</li></ol>${button("重新打开向导","setup","small","arrow")}</div></section><section class="panel"><div class="panel-head"><h2>数据留在本机</h2></div><div class="panel-body"><p>聊天记录、记忆、群词典与任务保存在本地。使用模型时，相关对话和召回内容会发送给你配置的模型服务。</p><p style="margin-top:12px">及时备份，也可以在各页面纠正、归档或删除记录。</p></div></section></aside></div>`;
}

function openModal(title,description,body,kind = "",record = null,submitLabel = "保存") {
  const dialog = $("#modal"); dialog.classList.remove("modal-wide");
  state.modalRecord = record; state.modalKind = kind;
  $("#modal-content").innerHTML = `<div class="modal-head"><div><h2>${e(title)}</h2>${description ? `<p>${e(description)}</p>` : ""}</div><button class="icon-button" data-action="close-modal" aria-label="关闭">${icon("close")}</button></div>${kind ? `<form data-form="${e(kind)}">` : ""}<div class="modal-body">${body}<div id="modal-error" hidden class="modal-error" aria-live="polite"></div></div><div class="modal-footer">${button(kind ? "取消" : "关闭","close-modal","ghost")}${kind ? `<button class="btn primary" type="submit">${e(submitLabel)}</button>` : ""}</div>${kind ? "</form>" : ""}`;
  if (!dialog.open) dialog.showModal();
  setTimeout(() => $("input:not([type=checkbox]),textarea,select",dialog)?.focus(),30);
}
function modalError(message) { const area = $("#modal-error"); if (area) { area.textContent = message; area.hidden = false; } else toast(message,true); }
function closeModal() { $("#modal").close(); state.modalRecord = null; state.modalKind = null; }
function memoryModalBase(item = null) {
  openModal(item ? "纠正一段记忆" : "记住一件事","保留来源与版本，让记忆准确，也让你始终能修改它。",`<div class="form-grid">${scopesField(item?.scope_id)}${textarea("content","记忆内容",item?.content || "","写清人物、事实与时间；每条记忆聚焦一件事。","required maxlength=\"6000\"")}${field("subject","关于谁 / 什么",item?.subject || "","text","可填写人物称呼、项目或事件。")}${field("user_id","所属用户",item?.user_id || "owner","text","本地聊天用户固定为 owner。")}${select("kind","记忆类型",["fact","preference","event","note"],item?.kind || "fact")}${select("visibility","可见范围",["private","group"],item?.visibility || "private")}${field("importance","重要程度（0—1）",item?.importance ?? .6,"number","","min=\"0\" max=\"1\" step=\"0.1\"")}${field("valid_to","有效至（可选）",toLocal(item?.valid_to),"datetime-local","留空表示持续有效。")}</div>${toggle("pinned","长期保留","保留重要约定，避免被普通整理策略归档。",item?.pinned)}`,"memory",item);
}
function jargonModal(item = null) {
  openModal(item ? "调整一个群词" : "教它一个新词","可以听懂，不必每次都说。词义与主动使用分别控制。",`<div class="form-grid">${scopesField(item?.scope_id)}${field("term","词语 / 黑话",item?.term || "","text","支持缩写、别名、短语与群梗。","required maxlength=\"100\"")}${field("topic","适用话题",item?.topic || "","text","例如游戏、聚餐、工作。")}${textarea("meaning","它在这里的意思",item?.meaning || "","同一个词可以添加多个解释。","required maxlength=\"4000\"")}${textarea("example","使用例句（可选）",item?.example || "","用一条真实语境，帮助它分清含义。")}${select("status","词义状态",["approved","pending","disabled","rejected"],item?.status || "approved","data-full")}</div>${toggle("use_allowed","允许主动使用","还需在会话设置中开启“主动使用群词”。",item?.use_allowed)}`,"jargon",item);
}
function toLocal(value) { if (!value) return ""; const d = new Date(value); if (Number.isNaN(d.getTime())) return ""; return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}T${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }
function taskModal(item = null) {
  openModal(item ? "调整这件事" : "交代一件小事","提醒会发送到所选会话。送达结果在任务列表中可查。",`<div class="form-grid">${scopesField(item?.scope_id)}${field("title","要做什么",item?.title || "","text","把提醒内容写清楚。","required data-full maxlength=\"1000\"")}${select("kind","类型",["todo","reminder"],item?.kind || "todo")}${select("repeat","重复",["none","daily","weekly"],item?.repeat || "none")}${field("due_at","提醒时间",toLocal(item?.due_at),"datetime-local","提醒类型必须填写；使用本机时区。","data-full")}${field("user_id","任务用户",item?.user_id || "owner","text","本地聊天填写 owner。","data-full")}</div>`,"task",item);
}
function personaModal(item = null) {
  openModal(item ? "打磨它的性格" : "创造一个新人格","给它稳定的性格、表达方式，以及对待人的态度。",`<div class="form-grid">${field("name","人格名称",item?.name || "","text","","required maxlength=\"100\"")}${field("color","代表颜色",/^#[0-9a-f]{6}$/i.test(item?.color || "") ? item.color : "#39c5bb","color")}${textarea("description","一句话介绍",item?.description || "","例如：温柔但有自己的想法，记得住小事。","maxlength=\"1000\"")}${textarea("system_prompt","人格与表达规则",item?.system_prompt || "","描述它怎样回应、怎样陪伴、什么时候少说。","required rows=\"7\" maxlength=\"6000\"")}${textarea("interests","兴趣主题",(item?.interests || []).join("\n"),"每行一个主题，例如动画、音乐。探索只使用这些公开主题，不发送聊天记录。","maxlength=\"1500\" rows=\"3\"")}</div>${toggle("exploration_enabled","允许这个人格定期探索","还需要在全局开启定期探索。新资料进入人格知识库，不自动发往聊天。",item?.exploration_enabled ?? false)}`,"persona",item);
  window.MikubotFeatures.personaExtras(item);
  $("#modal .modal-body").insertAdjacentHTML("afterbegin",`<div class="notice">${icon("spark")}<p>也可以从作品角色或已有语料生成一个人格草稿。</p><button type="button" data-action="start-distill">蒸馏人格</button></div>`);
}
function scopeModalBase(item = null) {
  openModal(item ? "调整会话设置" : "添加一个会话空间","默认隔离记忆与词典；加入同名共享空间后，仅共享明确允许的群可见记忆。QQ 会话仍需白名单。",`<div class="form-grid">${!item ? `<input type="hidden" name="kind" value="web"><details class="details field full"><summary>高级：手动填写 QQ 会话 ID</summary>${field("id","会话 ID（可选）","","text","本地对话无需填写。QQ 会话通常从实际收到的消息自动创建。","data-full placeholder=\"qq:group:123456789\"")}</details>` : ""}${field("name","会话名称",item?.name || "","text","","required data-full maxlength=\"100\"")}${select("persona_id","使用人格",state.personas.map(p => [p.id,p.name]),item?.persona_id || "default")}${select("activity","回应方式",[["quiet","仅被提及"],["balanced","适时回应"],["active","积极接话"]],item?.activity || "balanced")}${field("quiet_start","安静时段开始",item?.quiet_start || "","time")}${field("quiet_end","安静时段结束",item?.quiet_end || "","time")}</div>${toggle("enabled","启用这个会话","关闭后停止自动回复。",item?.enabled ?? true)}${toggle("auto_memory","自动记住重要信息","从对话中提取事实、偏好与经历。",item?.auto_memory ?? true)}${toggle("dictionary_understand","理解群词典","在合适语境召回已确认词义。",item?.dictionary_understand ?? true)}${toggle("dictionary_use","主动使用群词","只使用同时允许主动使用的已确认词条。",item?.dictionary_use ?? false)}${toggle("allow_tools","允许使用工具","包括记事、提醒、计算和已启用的检索工具。",item?.allow_tools ?? true)}`,"scope",item);
}
function showWizardModal() {
  window.MikubotQuickStart.open(1);
}
function showAuth() {
  window.MikubotPages?.close();
  window.MikubotExperience?.close();
  window.MikubotAuth.requireLogin();
}
function updateAdapterFields() {
  const adapter = $('[name="adapter"]')?.value || "napcat";
  if (!$("#onebot-fields")) return;
  $("#onebot-fields").hidden = adapter === "official"; $("#official-fields").hidden = adapter !== "official";
  $("#adapter-guide").textContent = adapter === "snowluma" ? "SnowLuma 支持 OneBot v11 正向 / 反向 WebSocket。请先启动 SnowLuma 并完成 QQ 登录。" : "请先启动 NapCat 并登录 QQ，再配置正向或反向 WebSocket。";
}

// 0.2: reviewable memories, scoped knowledge, culture learning and group turn-taking.
function memoryCard(item,candidate = false) {
  const confidence = Number(item.confidence);
  return `<article class="record-card"><div class="record-card-head"><div class="inline-stack">${tag(label(item.kind))}${item.pinned ? tag("长期保留","gold") : ""}</div>${tag(candidate ? "待你确认" : label(item.status),candidate ? "gold" : item.status === "active" ? "" : "gray")}</div>${item.subject ? `<h3 style="font-size:12px;margin-bottom:8px">${e(item.subject)}</h3>` : ""}<p class="record-text">${e(item.content)}</p>${candidate && (item.review_reason || item.reason) ? `<div class="review-reason">${icon("info")}<span>${e(item.review_reason || item.reason)}</span></div>` : ""}<div class="record-meta"><span>${e(item.user_id || "owner")}</span><span>${e(label(item.visibility))}</span>${Number.isFinite(confidence) ? `<span>提取置信度 ${Math.round(confidence * 100)}%</span>` : ""}<span>${(item.source_ids || []).length} 条来源 · v${e(item.version || 1)}</span></div><div class="record-actions">${candidate ? button("审核与冲突","review-memory","primary small","check",`data-id="${e(item.id)}"`) + button("不记住","reject-memory","ghost small","",`data-id="${e(item.id)}"`) : button("详情 / 来源","memory-detail","ghost small","",`data-id="${e(item.id)}"`)}${button("纠正","edit-memory","small","edit",`data-id="${e(item.id)}"`)}${!candidate && !["superseded","rejected","deleted"].includes(item.status) ? button(item.status === "archived" ? "恢复" : "归档","archive-memory","ghost small","",`data-id="${e(item.id)}"`) : ""}<button class="icon-button push-right" data-action="delete-memory" data-id="${e(item.id)}" aria-label="删除记忆">${icon("trash")}</button></div></article>`;
}
async function renderMemoryRecords() {
  const candidate = state.filters.status === "pending";
  state.records = rows(await api(candidate ? `/api/memory/candidates?${query({scope_id:state.scope})}` : `/api/memories?${query({scope_id:state.scope,q:state.filters.q,status:state.filters.status})}`));
  if (candidate && state.filters.q) state.records = state.records.filter(item => `${item.content} ${item.subject || ""}`.toLowerCase().includes(state.filters.q.toLowerCase()));
  return heading("LITTLE THINGS, WELL REMEMBERED","记忆档案","记得住，也记得准。让每段记忆有出处、可审核、能纠正。",button("检索试验","go-knowledge","","search") + button("记住一件事","new-memory","primary","plus")) + listToolbar("搜索内容、人物或关键词",[["","全部"],["active","有效"],["pending","待确认"],["archived","归档"],["superseded","已替代"],["rejected","未接纳"]]) + notice(candidate ? "自动提取的候选还不会用于回答。审核时可查看来源与可能冲突，决定保留旧事实还是用新记忆替代。" : "记忆默认按会话与用户范围隔离；加入共享空间且显式允许的群可见条目可以互通。新事实和纠错可以分开处理；被替代、归档与未接纳的内容不参与正常召回。") + (state.records.length ? `<div class="record-grid">${state.records.map(item => memoryCard(item,candidate)).join("")}</div>` : empty(candidate ? "shield" : "memory",candidate ? "没有待审核的记忆" : "值得记住的事，还在路上",candidate ? "开启自动记忆后，提取出的事实与偏好会来到这里。明确说“记住”仍可直接保存。" : "告诉它你的偏好，或手动添加一段记忆。也可以从知识页导入本地资料。",candidate ? "go-chat" : "new-memory",candidate ? "去聊一聊" : "添加第一条记忆"));
}
async function renderMemory() { const [base,panel] = await Promise.all([renderMemoryRecords(),window.MikubotFeatures.memoryToolsPanel()]); return base.replace('<div class="toolbar">',panel + '<div class="toolbar">'); }
async function renderCultureTerms() {
  let html = await renderCultureBase();
  html = html.replace(button("教一个新词","new-jargon","primary","plus"),button("分析最近聊天","analyze-jargon","","spark") + button("教一个新词","new-jargon","primary","plus"));
  const current = scope();
  const switches = `<section class="culture-controls"><div><div class="eyebrow">LEARN · UNDERSTAND · EXPRESS</div><h3>听懂与说出来，由你分别决定。</h3><p>学习只产生候选；确认词义后才用于理解。主动用梗还需要词条允许。</p></div><form data-form="culture-switches" class="culture-switch-form">${toggle("dictionary_learn","自动发现新词","分析重复出现的陌生说法。",current.dictionary_learn ?? false)}${toggle("dictionary_understand","听懂已确认词义","召回当前会话的群词典。",current.dictionary_understand ?? true)}${toggle("dictionary_use","主动使用群词","在合适的场合适量接梗。",current.dictionary_use ?? false)}<button type="submit" class="btn small">保存这组规则</button></form></section>`;
  const marker = '<div class="toolbar">'; html = html.replace(marker,switches + marker);
  for (const record of state.records) {
    const evidence = record.evidence;
    if (!evidence && !(record.source_ids || []).length) continue;
    const editButton = button("编辑","edit-jargon","small","edit",`data-id="${e(record.id)}"`);
    html = html.replace(editButton,button("学习证据","jargon-evidence","ghost small","",`data-id="${e(record.id)}"`) + editButton);
  }
  return html;
}
function searchResultCard(item) {
  const retrieval = item.retrieval || {}, reasons = retrieval.reasons || [], excerpt = retrieval.excerpt || item.content;
  const chunkIndex = item.chunk_index ?? retrieval.citation?.chunk_index ?? retrieval.chunk_index;
  return `<article class="record-card search-result"><div class="record-card-head"><div class="inline-stack">${tag(label(item.kind))}${item.subject ? tag(item.subject,"gray") : ""}</div><span class="search-score">${Number.isFinite(Number(retrieval.score)) ? Number(retrieval.score).toFixed(3) : "—"}<small>召回分数</small></span></div><p class="record-text">${e(excerpt)}</p><div class="retrieval-reasons">${reasons.map(reason => `<span>${icon("check")}${e(reason)}</span>`).join("")}</div><div class="record-meta">${item.filename || item.source_file ? `<span>${e(item.filename || item.source_file)}</span>` : ""}${chunkIndex !== undefined ? `<span>片段 ${Number(chunkIndex) + 1}</span>` : ""}<span>${e(label(item.visibility))}</span><span>${e(scopeName(item.scope_id))}</span></div><div class="record-actions">${button("查看记忆与来源","search-memory-detail","ghost small","memory",`data-id="${e(item.id)}"`)}</div></article>`;
}
async function renderKnowledgeBase() {
  const results = state.knowledgeResults, searched = results?.scope_id === state.scope;
  return heading("FIND THE RIGHT PIECE","需要的时候，想得起来。","导入本地资料，检验记忆召回，看看它为何想起这些内容。",button("人物画像","show-profile","","persona") + button("导入知识文件","upload-note","primary","upload")) + `<div class="knowledge-intro"><div>${icon("file")}<div><h3>资料留在当前会话</h3><p>支持 TXT、Markdown、CSV、JSON、PDF 与 DOCX。单文件最多 8 MB、30 万字；PDF / DOCX 需要解析依赖。不支持扫描件 OCR。</p></div></div><div>${icon("shield")}<div><h3>基础检索，无需额外模型</h3><p>默认使用词语、人物和时间等线索。语义检索可在设置中选配 Embedding，并单独核算费用。</p></div></div></div><section class="panel settings-section"><div class="section-title"><span>${icon("search")}</span><div><h2>召回试验台</h2><p>检查当前会话中，指定用户能召回哪些有效记忆。</p></div>${tag(state.settings.memory?.semantic_enabled ? "语义增强已启用" : "基础混合检索",state.settings.memory?.semantic_enabled ? "" : "gray")}</div><form data-form="knowledge-search"><div class="knowledge-search-row">${field("q","想找什么",state.knowledgeQuery || "","text","","required maxlength=\"1000\" placeholder=\"例如：我上次提到的咖啡偏好\"")}${field("user_id","以谁的身份检索",state.knowledgeUser || "owner","text","本地聊天使用 owner。","required")}<button type="submit" class="btn primary">${icon("search")}检验召回</button></div></form><p class="help-caption">此试验读取已有记忆，不生成聊天回复。开启语义增强后，查询可能产生 Embedding 调用费用。</p></section><div id="knowledge-results" class="knowledge-results">${searched ? `<div class="search-summary"><h3>${rows(results).length ? `找到 ${rows(results).length} 条相关记忆` : "没有找到相关记忆"}</h3><div class="inline-stack">${tag(label(results.mode) || "基础检索","gray")}${results.elapsed_ms !== undefined ? tag(`${results.elapsed_ms} ms`,"gray") : ""}</div></div>${results.message ? notice(results.message) : ""}${rows(results).length ? `<div class="record-grid">${rows(results).map(searchResultCard).join("")}</div>` : empty("search","这次还没想起来","试试人物、事件或原话中的关键词。也请检查记忆是否属于当前会话、是否有效、可见范围是否允许。","upload-note","导入一份资料")}` : empty("search","从一个问题，找到一段记忆","输入真正想找的问题，查看命中的原文、分数与召回原因。没有预置的演示结果。")}</div>`;
}
async function renderSettingsV02() {
  let html = await renderSettingsBase();
  const memory = state.settings.memory || {};
  const section = `<section class="panel settings-section" id="memory-settings-section"><div class="section-title"><span>${icon("memory")}</span><div><h2>记忆与检索能力</h2><p>先把基础检索做好，语义增强按需开启。</p></div>${tag("可选增强","gray")}</div><form data-form="memory-settings">${toggle("auto_review","自动记忆先审后用","自动提取的新记忆先进入候选；明确要求记住时仍直接保存。",memory.auto_review ?? true)}${toggle("organization_enabled","定期生成记忆整理建议","只产生重复与过期建议，应用前仍需审核，可以撤销。",memory.organization_enabled ?? true)}${toggle("semantic_enabled","启用 Embedding 语义检索","使用同一服务地址与密钥，调用独立的 Embedding 模型。默认关闭。",memory.semantic_enabled ?? false)}<div class="form-grid" style="margin-top:17px">${field("embedding_model","Embedding 模型名",memory.embedding_model || "","text","与聊天模型分别设置。服务需支持 /embeddings。","data-full placeholder=\"填写服务商提供的嵌入模型名\"")}${field("embedding_price","Embedding 价格 / 百万 Token",memory.embedding_price || 0,"number","人民币估算价格，纳入预算统计。","min=\"0\" step=\"0.001\"")}${field("top_k","每次最多召回",memory.top_k || 8,"number","控制上下文长度与记忆数量。","min=\"1\" max=\"20\" step=\"1\"")}</div><p class="help-caption">关闭“先审后用”时，仅自动接纳无冲突、置信度较高的稳定事实；冲突内容仍需确认。候选、归档与被替代记忆不参与正常召回。</p><div class="section-actions"><button class="btn primary" type="submit">保存记忆设置</button>${button("打开召回试验台","go-knowledge","ghost","search")}</div></form></section>`;
  html = html.replace('<section class="panel settings-section" id="qq-section">',`<details class="panel advanced-settings settings-foldout"><summary>高级设置 · 记忆与语义检索</summary>${section}</details>` + '<section class="panel settings-section" id="qq-section">');
  return html;
}

async function reviewMemoryBase(item) {
  const conflicts = rows(await api(`/api/memories/${encodeURIComponent(item.id)}/conflicts`));
  state.reviewing = item;
  openModal("这段记忆，值得留下吗？","审核后它才会参与回答。发生变化和纠正旧记忆，可以分别处理。",`<div class="review-candidate"><div class="inline-stack">${tag("新候选","gold")}${tag(label(item.kind))}</div><p class="record-text">${e(item.content)}</p></div><h3 style="margin-top:20px;margin-bottom:10px">${conflicts.length ? "可能冲突的现有记忆" : "没有发现直接冲突"}</h3>${conflicts.length ? `<div class="source-list">${conflicts.map(record => `<div class="source-item"><small>${e(record.subject || label(record.kind))} · ${e(fmt(record.updated_at))}</small><p>${e(record.content)}</p></div>`).join("")}</div>${toggle("replace_conflicts","用新记忆替代以上内容","旧记忆标记为已替代并退出召回，保留来源与历史。",false)}` : '<p class="help-caption">确认后将作为有效记忆保留。若它仍不准确，可先关闭窗口并纠正内容。</p>'}<p class="help-caption">来源消息：${(item.source_ids || []).length} 条。你可以先关闭，在详情中查看原始语境。</p>`,"memory-review",item,"确认并记住");
}
async function showProfile() {
  const userId = $('[data-form="knowledge-search"] [name="user_id"]')?.value.trim() || state.knowledgeUser || "owner", profile = await api(`/api/profile?${query({scope_id:state.scope,user_id:userId})}`);
  const sections = [["facts","事实"],["preferences","偏好"],["recent_events","共同经历"]];
  const content = sections.map(([key,title]) => `<h3 style="margin:16px 0 10px">${title}</h3><div class="source-list">${rows(profile[key]).length ? rows(profile[key]).map(item => `<div class="source-item"><p>${e(item.content || item)}</p><small>v${e(item.version || 1)} · ${(item.source_ids || []).length} 条来源</small></div>`).join("") : '<p class="help-caption">还没有对应的有效记忆。</p>'}</div>`).join("");
  openModal("从记忆里，认识你",`${scopeName(state.scope)} · ${userId} · 仅根据当前可见的有效记忆整理`,content);
}
async function showJargonEvidence(item) {
  const rawEvidence = item.evidence || {}, evidence = Array.isArray(rawEvidence) ? {message_ids:rawEvidence.map(value => value.message_id).filter(Boolean),observations:rawEvidence.map(value => `${value.user_id || "群成员"}：${value.quote || value.content || "（未保存原文）"}`)} : rawEvidence;
  const ids = evidence.message_ids || item.source_ids || [], messages = rows(await api(`/api/messages?${query({scope_id:item.scope_id,limit:200})}`));
  const observations = evidence.examples || evidence.observations;
  openModal("它为什么学到了这个词",`${item.term} · ${label(item.status)}`,`<p class="record-text">${e(item.meaning)}</p><dl class="detail-table"><dt>学习来源</dt><dd>${e(item.created_by || "手动教词")}</dd><dt>置信度</dt><dd>${Number.isFinite(Number(evidence.confidence)) ? `${Math.round(Number(evidence.confidence) * 100)}%` : "未记录"}</dd><dt>观察次数</dt><dd>${e(Array.isArray(observations) ? observations.length : observations || ids.length || "未记录")}</dd></dl>${Array.isArray(observations) && observations.length ? `<h3 style="margin-bottom:10px">观察线索</h3><div class="source-list">${observations.map(value => `<div class="source-item"><p>${e(typeof value === "string" ? value : value.text || value.content || value.quote || JSON.stringify(value))}</p></div>`).join("")}</div>` : ""}<h3 style="margin:18px 0 10px">来源消息</h3><div class="source-list">${ids.length ? ids.map(id => { const source = messages.find(message => message.id === id); return `<div class="source-item"><small>${e(source ? `${source.user_id} · ${fmt(source.created_at)}` : id)}</small><p>${e(source?.content || "来源已不在最近记录中，或已被删除。")}</p></div>`; }).join("") : '<p class="help-caption">手动词条没有关联的聊天证据。</p>'}</div>`);
}

async function saveModal(kind,form) {
  const data = getForm(form), item = state.modalRecord;
  if (kind === "provider") { await saveProvider(form); return; }
  if (kind === "mcp-server") { await saveMcpServer(form); return; }
  let endpoint, payload;
  if (kind === "memory") { endpoint = "/api/memories"; payload = {...data,importance:Number(data.importance),valid_to:data.valid_to ? new Date(data.valid_to).toISOString() : null}; }
  else if (kind === "jargon") { endpoint = "/api/jargon"; payload = data; }
  else if (kind === "task") { endpoint = "/api/tasks"; if (data.kind === "reminder" && !data.due_at) throw new Error("请为提醒选择时间。"); if (data.repeat !== "none" && !data.due_at) throw new Error("重复任务需要设置提醒时间。"); payload = {...data,due_at:data.due_at ? new Date(data.due_at).toISOString() : null}; }
  else if (kind === "persona") { endpoint = "/api/personas"; payload = {...data,interests:splitNames(data.interests),excluded_topics:splitNames(data.excluded_topics),exploration:{}}; for (const key of ["interval_hours","daily_searches","valid_days"]) { payload.exploration[key] = data["explore_"+key] === "" ? null : Number(data["explore_"+key]); delete payload["explore_"+key]; } }
  else if (kind === "scope") { endpoint = "/api/scopes"; payload = {...data,bot_aliases:splitNames(data.bot_aliases)}; if (!payload.id) delete payload.id; for (const key of ["cooldown_seconds","merge_window_ms","followup_seconds","daily_tokens"]) payload[key] = Number(data[key]); for (const key of ["trigger_at","trigger_reply","trigger_name","plan_enabled","proactive_reply"]) payload[key] = data[key] === "" ? null : data[key] === "true"; for (const key of ["planner_min_interval_ms","planner_daily_calls","planner_daily_tokens","planner_max_age_ms"]) payload[key] = data[key] === "" ? null : Number(data[key]); payload.output = data.output_override ? Object.fromEntries(["enabled","target_chars","max_chars","platform_max_chars","interval_ms","max_parts"].map(key => [key,key === "enabled" ? data["out_"+key] : Number(data["out_"+key])])) : null; for (const key of Object.keys(payload)) if (key.startsWith("out_") || key === "output_override") delete payload[key]; }
  else return;
  await api(endpoint + (item ? `/${encodeURIComponent(item.id)}` : ""),{method:item ? "PUT" : "POST",body:payload});
  closeModal(); toast(item ? "修改已保存" : "已添加到这个小世界"); await bootstrap();
}
function modelPayload(form) { const data = getForm(form), model = {base_url:data.base_url,model:data.model,vision:data.vision}; if (data.api_key) model.api_key = data.api_key; for (const key of ["temperature","input_price","output_price"]) if (data[key] !== undefined) model[key] = Number(data[key]); return model; }
function splitIds(value) { return String(value || "").split(/[\s,，;；]+/).map(item => item.trim()).filter(Boolean); }
function splitNames(value) { return [...new Set(String(value || "").split(/[\n\r,，;；]+/).map(item => item.trim()).filter(Boolean))]; }
async function saveSettings(kind,form) {
  const data = getForm(form); let payload;
  if (kind === "system") { await api("/api/system",{method:"PUT",body:{autostart:data.autostart}}); toast("开机启动设置已保存"); await bootstrap(); return; }
  if (kind === "model" || kind === "wizard") payload = {model:modelPayload(form)};
  else if (kind === "budget") payload = {budget:{daily_tokens:Number(data.daily_tokens),daily_cost:Number(data.daily_cost)},paused:data.paused};
  else if (kind === "memory-settings") { if (data.semantic_enabled && !data.embedding_model.trim() && !state.settings.routing?.embedding) throw new Error("请填写独立的 Embedding 模型名，或先指定语义检索专用模型配置。"); payload = {memory:{semantic_enabled:data.semantic_enabled,embedding_model:data.embedding_model.trim(),embedding_price:Number(data.embedding_price),top_k:Number(data.top_k),auto_review:data.auto_review,organization_enabled:data.organization_enabled}}; }
  else if (kind === "routing") { const routing = Object.fromEntries(Object.keys(routeNames).map(key => [key,data[key] || ""])); routing.fallback = [...new Set(Object.keys(data).filter(key => key.startsWith("fallback_")).sort((a,b) => Number(a.split("_")[1])-Number(b.split("_")[1])).map(key => data[key]).filter(Boolean))]; payload = {routing}; }
  else if (kind === "context-settings") { if (Number(data.keep_recent) >= Number(data.trigger_messages)) throw new Error("保留的近期消息数应少于触发消息数。"); payload = {context:{enabled:data.enabled,trigger_messages:Number(data.trigger_messages),max_chars:Number(data.max_chars),keep_recent:Number(data.keep_recent)}}; }
  else if (kind === "identity") { payload = {identity:{name:data.name.trim(),aliases:splitNames(data.aliases),respond_to_at:data.respond_to_at,respond_to_reply:data.respond_to_reply,respond_to_name:data.respond_to_name,planner_enabled:data.planner_enabled,proactive_enabled:data.proactive_enabled}}; }
  else if (kind === "output") { if (Number(data.target_chars) > Number(data.max_chars)) throw new Error("目标长度不能大于单段最大长度。"); payload = {output:{enabled:data.enabled,target_chars:Number(data.target_chars),max_chars:Number(data.max_chars),interval_ms:Number(data.interval_ms),max_parts:Number(data.max_parts),platform_max_chars:Number(data.platform_max_chars)}}; }
  else if (kind === "planner") { payload = {planner:{min_interval_ms:Number(data.min_interval_ms),daily_calls:Number(data.daily_calls),daily_tokens:Number(data.daily_tokens),max_age_ms:Number(data.max_age_ms)}}; }
  else if (kind === "exploration") { payload = {exploration:{enabled:data.enabled,interval_hours:Number(data.interval_hours),daily_searches:Number(data.daily_searches),max_results:Number(data.max_results),valid_days:Number(data.valid_days)}}; }
  else if (kind === "qq") {
    payload = {onebot:{adapter:data.adapter,enabled:data.adapter !== "official" && data.enabled,ws_url:data.ws_url,allowed_users:splitIds(data.owner_ids),allowed_groups:splitIds(data.allowed_groups),max_message_chars:Number(data.onebot_max_message_chars)},qq_official:{enabled:data.adapter === "official" && data.official_enabled,app_id:data.app_id,allowed_groups:splitIds(data.official_allowed_groups),allowed_users:splitIds(data.allowed_users),max_message_chars:Number(data.official_max_message_chars)}};
    if (data.access_token) payload.onebot.access_token = data.access_token;
    if (data.app_secret) payload.qq_official.app_secret = data.app_secret;
  }
  await api("/api/settings",{method:"PUT",body:payload});
  if (kind === "wizard") { closeModal(); sessionStorage.removeItem("qunyu-wizard-skipped"); state.page = "chat"; localStorage.setItem("qunyu-page","chat"); }
  toast("设置已保存"); await bootstrap();
}
async function testModel(target) {
  const form = target.closest("form"), result = $("#model-result",form);
  result.innerHTML = '<div class="section-actions inline-spinner"><span class="spinner small"></span>正在连接真实模型服务…</div>';
  target.disabled = true;
  try { const response = await api("/api/model/test",{method:"POST",body:modelPayload(form)}); result.innerHTML = `<div class="result-block">${e(response.ok === false ? "连接未成功" : "连接成功")} · ${e(response.latency_ms ?? "—")} ms\n${e(response.reply || response.message || "模型服务已返回结果。")}</div>`; if (response.ok === false) toast("模型测试未成功",true); }
  catch (error) { result.innerHTML = `<div class="modal-error">${e(error.message)}</div>`; }
  finally { target.disabled = false; }
}
async function showSources(message) {
  const metadata = message.metadata || {}, memories = metadata.memories || metadata.memory_ids || metadata.references || Object.keys(metadata.memory_versions || {}), jargon = metadata.jargon || metadata.jargon_ids || Object.keys(metadata.jargon_versions || {});
  const [memoryRecords,jargonRecords] = await Promise.all([api(`/api/memories?${query({scope_id:state.scope})}`),api(`/api/jargon?${query({scope_id:state.scope})}`)]);
  const resolve = (items,all) => items.map(item => typeof item === "object" ? item : rows(all).find(record => record.id === item) || {id:item,content:"这条来源已不可用。"});
  openModal("这次对话，想起了什么","只显示当前会话的可用来源。",`<div class="source-list">${resolve(memories,memoryRecords).map(item => `<div class="source-item"><small>记忆 · ${e(item.subject || label(item.kind))}</small><p>${e(item.content || item.id)}</p></div>`).join("")}${resolve(jargon,jargonRecords).map(item => `<div class="source-item"><small>群词 · ${e(item.term)}</small><p>${e(item.meaning || item.id)}</p></div>`).join("") || '<p class="help-caption">暂无可展示来源。</p>'}</div>`);
}
async function memoryDetailBase(item) {
  const messages = rows(await api(`/api/messages?${query({scope_id:item.scope_id})}`)), sources = (item.source_ids || []).map(id => messages.find(message => message.id === id));
  openModal("记忆的来处",`${scopeName(item.scope_id)} · 版本 ${item.version || 1}`,`<p class="record-text">${e(item.content)}</p><dl class="detail-table"><dt>类型</dt><dd>${e(label(item.kind))}</dd><dt>当前状态</dt><dd>${e(label(item.status))}</dd><dt>可见范围</dt><dd>${e(label(item.visibility))}</dd><dt>所属用户</dt><dd>${e(item.user_id || "owner")}</dd><dt>创建时间</dt><dd>${e(fmt(item.created_at,true))}</dd><dt>更新时间</dt><dd>${e(fmt(item.updated_at,true))}</dd><dt>有效至</dt><dd>${item.valid_to ? e(fmt(item.valid_to,true)) : "持续有效"}</dd><dt>重要程度</dt><dd>${e(item.importance ?? "—")}</dd></dl><h3 style="margin-bottom:12px">来源消息</h3><div class="source-list">${sources.length ? sources.map((source,index) => `<div class="source-item"><small>${e(source ? `${source.user_id} · ${fmt(source.created_at)}` : item.source_ids[index])}</small><p>${e(source?.content || "原始消息已不可用。")}</p></div>`).join("") : '<p class="help-caption">手动创建或导入的记忆，没有关联聊天来源。</p>'}</div>`);
}
async function confirmAction(title,description,perform,labelText = "确认") {
  openModal(title,"",`<p class="record-text">${e(description)}</p>`,"confirm",null,labelText);
  state.confirm = perform;
}

async function reviewMemory(item) {
  await reviewMemoryBase(item);
  const messages = rows(await api(`/api/messages?${query({scope_id:item.scope_id,limit:200})}`));
  if (state.modalRecord?.id !== item.id || !$("#modal").open) return;
  const sources = (item.source_ids || []).map(id => messages.find(message => message.id === id));
  $("#modal .modal-body").insertAdjacentHTML("beforeend",`<div class="memory-conflict-section"><h3 style="margin-bottom:10px">原始语境</h3><div class="source-list">${sources.length ? sources.map((source,index) => `<div class="source-item"><small>${e(source ? `${source.user_id} · ${fmt(source.created_at)}` : item.source_ids[index])}</small><p>${e(source?.content || "该来源不在最近 200 条记录中，或已被删除。")}</p></div>`).join("") : '<p class="help-caption">没有关联聊天来源。请结合内容与其他记忆审核。</p>'}</div></div>`);
}

function memoryModal(item = null) {
  memoryModalBase(item);
  $("#modal .form-grid").insertAdjacentHTML("beforeend",field("property","事实属性（可选）",item?.property || "","text","用于识别同一事实的变化，例如 residence_city、饮食偏好。相同主体与属性的不同内容会提示冲突。","data-full maxlength=\"120\""));
  $("#modal .form-grid").insertAdjacentHTML("afterend",toggle("shareable","允许在指定共享空间中使用","仅对群可见记忆生效。来源与目标会话必须加入同一共享空间；私有内容始终隔离。",item?.shareable ?? false));
}
async function renderKnowledgeV02() {
  let html = await renderKnowledgeBase();
  const buttonRow = `<div class="knowledge-analysis"><div><h3>把近期聊天，整理成可审核的记忆。</h3><p>需要已配置的文本模型并计入用量。按上方用户整理；至少需要 4 条近期原始用户消息，且当前会话已启用自动记忆。</p></div>${button("整理当前用户记忆候选","analyze-memory","small","spark")}</div><div id="memory-analysis-result" aria-live="polite"></div>`;
  html = html.replace('</form><p class="help-caption">此试验读取已有记忆',`</form>${buttonRow}<p class="help-caption">此试验读取已有记忆`);
  const results = state.knowledgeResults;
  if (results?.scope_id === state.scope) {
    const semantics = results.semantic || {};
    const diagnostic = (semantics.error ? notice(`语义增强暂时不可用，已使用基础检索：${semantics.error}`,"warning") : semantics.enabled && !semantics.used && semantics.reason ? notice(semantics.reason) : "") + `<details class="details retrieval-diagnostics"><summary>查看本次召回诊断</summary><dl class="detail-table"><dt>检索模式</dt><dd>${e(label(results.mode))}</dd><dt>排序方法</dt><dd>${e(results.algorithm || "未返回")}</dd><dt>文本切分</dt><dd>${e(results.tokenizer || "未返回")}</dd><dt>语义增强</dt><dd>${semantics.enabled ? semantics.used ? "本次已使用" : "本次未使用" : "未启用"}</dd><dt>向量缓存命中</dt><dd>${e(semantics.cache_hits ?? 0)}</dd><dt>本次嵌入片段</dt><dd>${e(semantics.embedded_chunks ?? 0)}</dd>${semantics.dimension ? `<dt>向量维度</dt><dd>${e(semantics.dimension)}</dd>` : ""}</dl><p class="help-caption">召回分数用于对本次结果排序，不是回答正确率或置信概率。</p></details>`;
    html = html.replace('<div id="knowledge-results" class="knowledge-results">',`<div id="knowledge-results" class="knowledge-results">${diagnostic}`);
  }
  return html;
}
async function analyzeMemory(target) {
  if (!configuredModel("memory").base_url || !configuredModel("memory").model) { toast("请先配置记忆与学习模型（或默认模型），整理会计入模型用量。",true); await navigate("settings"); return; }
  if (state.settings.paused) { toast("当前已暂停。请在设置中恢复运行后整理候选。",true); return; }
  if (!scope().auto_memory) { toast("请先在当前会话设置中开启自动记忆。",true); return; }
  const userId = $('[data-form="knowledge-search"] [name="user_id"]')?.value.trim() || state.knowledgeUser || "owner", analyzedScope = state.scope;
  state.knowledgeUser = userId;
  const original = target.innerHTML; target.disabled = true; target.innerHTML = '<span class="spinner small"></span>正在整理，计入模型用量…';
  try {
    const result = await api("/api/memory/analyze",{method:"POST",body:{scope_id:analyzedScope,user_id:userId}}), count = (result.candidates || []).length;
    if (state.scope !== analyzedScope || state.page !== "knowledge") { toast(`用户 ${userId} 当前有 ${count} 条待确认记忆`); return; }
    $("#memory-analysis-result").innerHTML = `<div class="notice ${count ? "" : "warning"}">${icon(count ? "check" : "info")}<p>${e(result.message || result.reason || (count ? `用户 ${userId} 当前有 ${count} 条待确认记忆；确认前不会用于回答。` : "此次没有返回待确认候选。可以检查原始消息数量、自动记忆规则与运行记录。"))}</p>${count ? '<button data-action="open-memory-candidates">去审核</button>' : ""}</div>`;
    toast(count ? `当前有 ${count} 条候选等你确认` : "本次没有返回待确认候选");
  } finally { target.disabled = false; target.innerHTML = original; }
}

// 0.3: provider routing, grounded context summaries, expression learning and diagnostics.
const routeNames = {chat:"日常对话",planner:"Planner 语义规划",memory:"记忆与学习",gate:"群聊判断（兼容路由）",summary:"上下文与人格知识整理",embedding:"语义检索"};
const checkNames = {ok:"正常",warning:"待留意",error:"需处理",info:"提示"};
function checkStatus(value) { return checkNames[value] || "未检查"; }
function cultureTabs() { return `<div class="culture-mode-tabs"><button class="${state.cultureMode !== "expressions" ? "active" : ""}" data-action="culture-mode" data-mode="terms">${icon("culture")}黑话与群梗<small>听懂你们的语言</small></button><button class="${state.cultureMode === "expressions" ? "active" : ""}" data-action="culture-mode" data-mode="expressions">${icon("chat")}表达与语气<small>学会在合适场合怎样说</small></button></div>`; }
async function renderCulture() {
  if (state.cultureMode !== "expressions") {
    const html = await renderCultureTerms();
    return html.replace('<section class="culture-controls">',cultureTabs() + '<section class="culture-controls">');
  }
  state.records = rows(await api(`/api/expressions?${query({scope_id:state.scope,status:state.filters.status})}`));
  if (state.filters.q) state.records = state.records.filter(item => `${item.term} ${item.meaning} ${item.topic || ""}`.toLowerCase().includes(state.filters.q.toLowerCase()));
  const current = scope();
  return heading("A WAY WITH WORDS","学会表达，也保留自己的性格。","黑话负责词义，表达学习负责场景、语气与句式。人格仍然决定怎么说。",button("分析表达样例","analyze-expressions","","spark") + button("教一种表达","new-expression","primary","plus")) + cultureTabs() + `<section class="culture-controls"><div><div class="eyebrow">LEARN · REVIEW · EXPRESS</div><h3>适合安慰时，别只会接梗。</h3><p>学习候选不会自动生效。先看来源和适用场景，确认后再允许采用。</p></div><form data-form="expression-switches" class="culture-switch-form">${toggle("expression_learn","自动学习表达","从近期真实群聊发现表达候选。",current.expression_learn ?? false)}${toggle("expression_use","采用已确认表达","结合人格与当前语境，适量使用。",current.expression_use ?? false)}<button type="submit" class="btn small">保存表达规则</button></form></section>` + listToolbar("搜索场景、句式或语气",[["","全部"],["pending","待确认"],["approved","已确认"],["disabled","已停用"],["rejected","未接纳"]]) + notice("表达分析使用已配置的学习模型并计入预算。它学习可复用的表达方式，不把他人的身份、关系或经历当作自己的人设。") + (state.records.length ? `<div class="record-grid">${state.records.map(item => `<article class="record-card"><div class="record-card-head"><h3>${e(item.term)}</h3>${tag(label(item.status),item.status === "pending" ? "gold" : item.status === "approved" ? "" : "gray")}</div><p class="record-text">${e(item.meaning)}</p>${item.topic ? `<div class="record-meta"><span>适用场景 · ${e(item.topic)}</span></div>` : ""}${item.example ? `<div class="persona-preview">${e(item.example)}</div>` : ""}<div class="record-meta"><span>${item.use_allowed ? "允许采用" : "暂不主动采用"}</span><span>${(item.source_ids || []).length} 条来源</span></div><div class="record-actions">${item.status === "pending" ? button("确认表达","approve-jargon","primary small","check",`data-id="${e(item.id)}"`) + button("不采用","reject-jargon","ghost small","",`data-id="${e(item.id)}"`) : ""}${button("来源样例","jargon-evidence","ghost small","",`data-id="${e(item.id)}"`)}${button("编辑","edit-expression","small","edit",`data-id="${e(item.id)}"`)}${["approved","disabled"].includes(item.status) ? button(item.status === "disabled" ? "启用" : "停用","toggle-jargon","ghost small","",`data-id="${e(item.id)}"`) : ""}<button class="icon-button push-right" data-action="delete-jargon" data-id="${e(item.id)}" aria-label="删除表达">${icon("trash")}</button></div></article>`).join("")}</div>` : empty("chat","表达的默契，从真实聊天里来","开启表达学习后分析近期聊天，或教它一种适用于认可、安慰、邀请等场合的表达。","new-expression","教一种表达"));
}
function expressionModal(item = null) {
  jargonModal(item);
  $("#modal .modal-head h2").textContent = item ? "打磨一种表达" : "教它一种表达";
  $("#modal .modal-head p").textContent = "记录适用场景与句式，确认后再决定是否主动采用。";
  for (const [name,title] of Object.entries({term:"表达短语 / 句式",meaning:"适用情境说明",topic:"关联话题",example:"原始示例（可选）"})) {
    const input = $(`[name="${name}"]`,$("#modal")); input.closest(".field").querySelector("label").textContent = title;
  }
  const hints = {term:"2—30 字的自然短语，例如“稍等我捋一捋”。",meaning:"说明什么场合适合说这句话，2—240 字。",topic:"例如安慰、认可、邀请、讨论整理。",example:"保留真实语境，避免模仿特定成员身份。"};
  for (const [name,hint] of Object.entries(hints)) { const helper = $(`[name="${name}"]`,$("#modal")).closest(".field").querySelector("small"); if (helper) helper.textContent = hint; }
  $('[name="status"]',$("#modal")).closest(".field").querySelector("label").textContent = "审核状态";
  const useToggle = $('[name="use_allowed"]',$("#modal")).closest(".toggle-field");
  $(".toggle-copy strong",useToggle).textContent = "允许采用这条表达";
  $(".toggle-copy small",useToggle).textContent = "还需在当前会话开启“采用已确认表达”。";
  $('[name="term"]',$("#modal")).minLength = 2;
  $('[name="term"]',$("#modal")).maxLength = 30;
  $('[name="meaning"]',$("#modal")).minLength = 2;
  $('[name="meaning"]',$("#modal")).maxLength = 240;
  $('[name="status"]',$("#modal")).value = item?.status || "pending";
  $("#modal form").insertAdjacentHTML("beforeend",'<input type="hidden" name="entry_type" value="expression">');
}
function providerOptions(defaultLabel = "使用默认模型") {
  return [["",defaultLabel],...(state.settings.providers || []).map(item => [item.id,`${item.name} · ${item.model}${item.enabled === false ? "（已停用）" : ""}`])];
}
function providerSection(status) {
  const providers = (state.settings.providers || []).filter(item => !item.source_id), routing = state.settings.routing || {}, statuses = status.providers || [];
  return `<section class="panel settings-section" id="provider-section"><div class="section-title"><span>${icon("spark")}</span><div><h2>模型池与任务分工</h2><p>给不同任务安排合适的模型，按需指定备用服务。</p></div>${button("添加模型配置","new-provider","small","plus")}</div>${providers.length ? `<div class="provider-grid">${providers.map(item => { const health = Array.isArray(statuses) ? statuses.find(value => value.id === item.id) || {} : statuses[item.id] || {}; return `<article class="provider-card"><div class="record-card-head"><div><h3>${e(item.name)}</h3><p class="provider-model mono">${e(item.model)}</p></div>${tag(item.enabled === false ? "已停用" : health.circuit_open ? "暂时熔断" : "已启用",health.circuit_open ? "red" : item.enabled === false ? "gray" : "")}</div><div class="provider-flags">${tag(item.vision ? "图片输入" : "文本","gray")}${tag(item.tools === false ? "工具关闭" : "允许工具","gray")}${tag(item.api_key_set ? "密钥已保存" : "未配置密钥","gray")}</div>${health.last_error ? `<p class="provider-error">${e(health.last_error)}</p>` : `<p class="help-caption">${health.last_success_at ? `最近成功 · ${e(fmt(health.last_success_at))}` : "尚无成功调用记录；启用状态不代表已验证连接。"}</p>`}<div class="record-actions">${button("编辑","edit-provider","small","edit",`data-id="${e(item.id)}"`)}${button("测试已保存配置","test-provider","ghost small","link",`data-id="${e(item.id)}"`)}<button class="icon-button push-right" data-action="delete-provider" data-id="${e(item.id)}" aria-label="删除模型配置">${icon("trash")}</button></div></article>`; }).join("")}</div>` : empty("spark","按需添加模型，不急着增加配置","默认模型已经可以使用全部基础能力。有不同服务时，再为聊天、记忆、判断或整理指定专用配置。","new-provider","添加第一个专用配置")}<form data-form="routing" class="routing-form"><h3>让每种任务，各得其所。</h3><div class="form-grid" style="margin-top:16px">${Object.entries(routeNames).map(([key,title]) => select(key,title,providerOptions(key === "embedding" ? "默认服务 + 独立嵌入模型名" : "使用下方默认模型"),routing[key] || "")).join("")}</div><h3 style="margin:21px 0 8px">备用顺序</h3><p class="help-caption" style="margin:0 0 12px">调用遇到可重试的服务故障时，按顺序尝试。备用服务会接收同一份相关上下文，请只选择你愿意使用的服务。</p><div class="form-grid">${Array.from({length:3},(_,index) => select(`fallback_${index}`,`第 ${index + 1} 个备用`,providerOptions("不使用备用"),routing.fallback?.[index] || "")).join("")}</div><p class="help-caption">仅对限流、服务端错误与建连失败回退。密钥错误、预算限制或响应中途超时不会自动换服务。Embedding 指定配置后，使用该配置的模型名与输入单价。</p><div class="section-actions"><button type="submit" class="btn primary">保存任务分工</button>${button("查看路由状态","go-diagnostics","ghost","shield")}</div></form></section>`;
}
function providerModal(item = null) {
  const generatedId = `provider-${Date.now().toString(36)}`;
  const fields = settingsModelForm(item || {}).replace('list="model-list"',"").replace('<datalist id="model-list"></datalist>',"");
  openModal(item ? "编辑一套模型配置" : "添加一套模型配置","保存后，可在模型卡片测试真实连接，再把它安排给具体任务。",`<input type="hidden" name="id" value="${e(item?.id || generatedId)}"><div class="form-grid">${field("name","配置名称",item?.name || "","text","例如：日常聊天、轻量判断、资料整理。","required data-full maxlength=\"100\"")}</div><div style="margin-top:16px">${fields}</div>${toggle("enabled","启用这套配置","只有启用的配置才能参与正常路由。",item?.enabled ?? true)}${toggle("tools","允许工具调用","用于聊天或办事的配置需要支持工具调用。",item?.tools ?? true)}${item?.api_key_set ? toggle("clear_api_key","清除已保存密钥","勾选后删除当前密钥。留空密钥且不勾选则保持原值。",false) : ""}<p class="help-caption">连接测试使用已保存配置，修改后请先保存。此配置的内部标识：${e(item?.id || generatedId)}</p>`,"provider",item);
}

function providerArray() { return (state.settings.providers || []).map(item => { const clean = {...item}; delete clean.api_key; delete clean.api_key_set; return clean; }); }
async function saveProvider(form) {
  const data = getForm(form), providers = providerArray(), current = {id:data.id,name:data.name,...modelPayload(form),enabled:data.enabled,tools:data.tools};
  if (data.clear_api_key) current.clear_api_key = true;
  const index = providers.findIndex(item => item.id === data.id);
  if (index >= 0) providers[index] = current; else providers.push(current);
  await api("/api/settings",{method:"PUT",body:{providers}}); closeModal(); toast("模型配置已保存，可以测试连接并安排任务"); await bootstrap();
}
async function renderSettings() {
  const [base,status] = await Promise.all([renderSettingsV02(),api("/api/providers/status")]);
  state.providerStatus = status;
  let html = base.replace('<section class="panel settings-section" id="model-section">',`<details class="panel advanced-settings settings-foldout"><summary>高级设置 · 多模型与任务分工</summary>${providerSection(status)}</details>` + '<section class="panel settings-section" id="model-section">');
  html = html.replace('备份包含数据库与设置，不包含模型、OneBot 和官方机器人密钥。','备份包含数据库、设置、人格知识及脱敏工具历史，不包含模型、MCP、OneBot 和官方机器人密钥。工具历史恢复后只供查看，不会重新执行。');
  html = html.replace('<h2>语言模型</h2>','<h2>默认模型</h2>').replace('一套模型配置，让对话、记忆与工具一起工作。','未指定专用配置的任务使用这套模型。已有默认配置可以继续使用。');
  html = html.replace('>Embedding 模型名</label>','>未指定路由时的 Embedding 模型名</label>').replace('与聊天模型分别设置。服务需支持 /embeddings。','未指定语义检索专用配置时，使用默认服务与此模型名。').replace('>Embedding 价格 / 百万 Token</label>','>未指定路由时的 Embedding 单价</label>');
  html = html.replace('使用同一服务地址与密钥，调用独立的 Embedding 模型。默认关闭。','使用指定的语义检索配置；未指定时采用默认服务与独立模型名。默认关闭。');
  const context = state.settings.context || {};
  const contextSection = `<section class="panel settings-section" id="context-section"><div class="section-title"><span>${icon("memory")}</span><div><h2>长对话上下文</h2><p>把较早的交流整理成带来源的摘要，为当前话题留出空间。</p></div></div><form data-form="context-settings">${toggle("enabled","启用上下文整理","按消息数与长度触发；各会话还需独立开启。整理会调用指定模型并计入预算。",context.enabled ?? false)}<div class="form-grid" style="margin-top:17px">${field("trigger_messages","触发消息数",context.trigger_messages || 60,"number","累计到一定数量后整理较早消息。","min=\"20\" max=\"400\" step=\"1\"")}${field("max_chars","上下文字符阈值",context.max_chars || 18000,"number","控制对话上下文长度。","min=\"4000\" max=\"60000\" step=\"1000\"")}${field("keep_recent","保留近期消息数",context.keep_recent || 24,"number","这些消息保留原文，不纳入旧内容摘要。","min=\"6\" max=\"60\" step=\"1\"")}</div><p class="help-caption">摘要保留原始消息来源。事实与偏好仍由可纠正的记忆档案管理；资料中的文字不会变成系统指令。</p><div class="section-actions"><button type="submit" class="btn primary">保存上下文规则</button>${button("查看当前会话摘要","go-knowledge","ghost","memory")}</div></form></section>`;
  const toolsSection = `<section class="panel settings-section"><div class="section-title"><span>${icon("tools")}</span><div><h2>扩展工具</h2><p>连接 MCP 服务，由你逐次批准每次调用。</p></div></div><p class="help-caption" style="margin-top:0">服务、工具允许列表与审批记录集中放在扩展工具页。各会话默认关闭；开启后，模型可以提出请求，执行前仍需本地管理员确认。</p><div class="section-actions">${button("管理服务与调用审批","go-tools","","shield")}</div></section>`;
  return html.replace('<section class="panel settings-section" id="qq-section">',identitySection() + `<details class="panel advanced-settings settings-foldout"><summary>高级设置 · 模型分工、输出、探索与学习</summary>${plannerSection() + outputSection() + explorationSection() + contextSection + toolsSection}</details>` + '<section class="panel settings-section" id="qq-section">');
}

function diagnosticCard(check) { return `<article class="diagnostic-card ${e(["ok","warning","error","info"].includes(check.status) ? check.status : "info")}"><div class="diagnostic-symbol">${icon(check.status === "ok" ? "check" : "info")}</div><div><h3>${e(check.title || check.label || check.id)}</h3><p>${e(check.detail || check.message || "尚未返回检查说明。")}</p></div>${tag(checkStatus(check.status),check.status === "error" ? "red" : check.status === "warning" ? "gold" : check.status === "info" ? "gray" : "")}</article>`; }
function plannerSummary(social) {
  const plan = social.last_plan, actionNames = {reply:"回复",skip:"本轮不回复"};
  return (plan ? `<div class="planner-decision"><div class="inline-stack">${tag(actionNames[plan.action] || plan.action,plan.action === "skip" ? "gray" : "")}<small>${e(fmt(social.last_planned_at))}</small></div><p>${e(plan.reason || "未返回判断原因。")}</p>${plan.reply_intent ? `<p class="help-caption">准备回应：${e(plan.reply_intent)}</p>` : ""}<div class="record-meta"><span>近期消息 ${e(social.heat ?? "—")} 条</span><span>参与者 ${e(social.speakers ?? "—")} 人</span><span>${e(plan.user_id || "")}</span></div></div>` : '<p class="help-caption">当前会话还没有群聊规划记录。连接 QQ 并收到真实消息后，这里显示最近的判断。</p>') + `<details class="details"><summary>查看规划与学习细节</summary><div class="code-block">${e(JSON.stringify(social,null,2))}</div></details>`;
}
async function renderOverview() {
  const [base,diagnostics] = await Promise.all([renderOverviewBase(),api(`/api/diagnostics?${query({scope_id:state.scope})}`)]);
  return base + window.MikubotQuickStart.diagnosticsPanel(diagnostics);
}
async function renderDiagnostics() {
  const [diagnostics,status] = await Promise.all([api(`/api/diagnostics?${query({scope_id:state.scope})}`),api("/api/providers/status")]), checks = diagnostics.checks || [], routes = status.routes || {};
  return heading("DIAGNOSTICS","哪里需要照看，一眼就知道。","检查连接配置、模型路由与运行状态；这里不会主动请求外部服务。",button("刷新自检","refresh","primary","refresh")) + `<div class="diagnostic-list">${checks.map(diagnosticCard).join("") || empty("shield","还没有自检结果","服务尚未返回检查项，请稍后刷新。")}</div><div class="dashboard-grid" style="margin-top:23px"><section class="panel"><div class="panel-head"><h2>当前任务路由</h2>${button("调整分工","go-settings","ghost small","settings")}</div><div class="panel-body"><div class="route-status-list">${Object.entries(routeNames).map(([key,title]) => { const current = routes[key] || {}; return `<div class="route-status"><span>${title}</span><div><strong>${e(current.name || (current.provider_id ? current.provider_id : "默认模型"))}</strong><small>${e(current.model || "未配置")}</small></div></div>`; }).join("")}</div><details class="details"><summary>查看备用与故障状态</summary><div class="code-block">${e(JSON.stringify(status,null,2))}</div></details></div></section><section class="panel"><div class="panel-head"><h2>群聊判断与学习状态</h2></div><div class="panel-body"><p class="help-caption" style="margin-top:0">群聊先规划交谈对象与参与价值，再选择回复或本轮不回复。只有当前权限允许的会话才进入处理。</p>${plannerSummary(diagnostics.social || diagnostics.planner || {})}<div class="section-actions">${button("调整会话规则","go-groups","small","groups")}</div></div></section></div>`;
}
function contextSummaryText(result) {
  const summary = result?.summary || result?.active_summary || result?.context || "";
  return typeof summary === "string" ? summary : summary.content || summary.summary || summary.text || "";
}
async function renderKnowledge() {
  const [base,context] = await Promise.all([renderKnowledgeV02(),api(`/api/context/status?${query({scope_id:state.scope,user_id:state.knowledgeUser || "owner"})}`)]);
  state.contextStatus = context;
  const summary = contextSummaryText(context), details = typeof context.summary === "object" ? context.summary || {} : context;
  const sourceIds = context.source_ids || details.source_ids || [], section = `<section class="panel context-preview"><div class="panel-head"><div><div class="panel-kicker">CONVERSATION WITH ROOTS</div><h2>长对话，留住来处。</h2><p>用户 ${e(state.knowledgeUser || "owner")} · 当前会话摘要与来源。</p></div>${button("整理当前上下文","compact-context","small","spark")}</div><div class="panel-body">${summary ? `<p class="context-summary-text">${e(summary)}</p><div class="record-meta"><span>${sourceIds.length} 条原始消息来源</span><span>覆盖 ${e(context.covered_count ?? details.covered_message_ids?.length ?? sourceIds.length)} 条消息</span><span>${e(fmt(context.last_compacted_at || details.updated_at || details.created_at))}</span>${tag("派生摘要","gray")}</div><div class="section-actions">${button("查看来源范围","context-sources","ghost small","memory")}</div>` : '<p class="help-caption" style="margin-top:0">还没有上下文摘要。对话积累后可以手动整理，或在设置与会话中开启自动整理。</p>'}<p class="help-caption">整理需要模型并计入用量。近期原文继续保留，摘要与事实记忆分别管理。</p><div id="context-result" aria-live="polite"></div></div></section>`;
  return base.replace('<div class="knowledge-intro">',section + '<div class="knowledge-intro">');
}
async function compactContext(target) {
  const userId = $('[data-form="knowledge-search"] [name="user_id"]')?.value.trim() || state.knowledgeUser || "owner", scopeId = state.scope, original = target.innerHTML;
  target.disabled = true; target.innerHTML = '<span class="spinner small"></span>整理中，计入模型用量…';
  try {
    const result = await api("/api/context/compact",{method:"POST",body:{scope_id:scopeId,user_id:userId}});
    state.knowledgeUser = userId;
    if (state.page === "knowledge" && state.scope === scopeId) { await renderPage(); if ($("#context-result")) $("#context-result").innerHTML = notice(result.message || (result.compressed ? "上下文已整理，原始消息来源已保留。" : "本次未压缩上下文，请检查消息数量与整理设置。"),result.compressed === false ? "warning" : ""); }
    toast(result.message || (result.compressed ? "上下文已整理" : "本次没有生成新的摘要"));
  } finally { target.disabled = false; target.innerHTML = original; }
}
async function contextSources() {
  const current = state.contextStatus || {}, summary = typeof current.summary === "object" ? current.summary || {} : current, ids = current.source_ids || summary.source_ids || [];
  const messages = rows(await api(`/api/messages?${query({scope_id:state.scope,limit:200})}`));
  openModal("摘要保留了哪些来处","摘要是派生内容，原始消息仍作为事实来源。",`<p class="help-caption" style="margin-top:0;margin-bottom:15px">关联 ${ids.length} 条来源。仅展示最近 200 条记录中仍可读取的原文。</p><div class="source-list">${ids.map(id => { const message = messages.find(value => value.id === id); return `<div class="source-item"><small>${e(message ? `${message.user_id} · ${fmt(message.created_at)}` : id)}</small><p>${e(message?.content || "原文已不在最近记录范围内，或已被删除。")}</p></div>`; }).join("") || '<p class="help-caption">没有返回可展示的来源编号。</p>'}</div>`);
}
function renderMessage(item) {
  const html = renderMessageBase(item), expressionIds = item.metadata?.expression_ids || [];
  if (!expressionIds.length) return html;
  return html.replace('</div></article>',`<div class="message-references"><button class="reference-button" data-action="expression-sources" data-id="${e(item.id)}">参考 ${expressionIds.length} 条表达 ↗</button></div></div></article>`);
}
async function expressionSources(message) {
  const ids = message.metadata?.expression_ids || [], records = rows(await api(`/api/expressions?${query({scope_id:state.scope})}`));
  openModal("这次对话，参考了哪些表达","显示当前仍可读取的表达与适用情境。",`<div class="source-list">${ids.map(id => { const item = records.find(value => value.id === id); return `<div class="source-item"><small>${e(item ? `${label(item.status)} · ${item.topic || "表达习惯"}` : id)}</small><p>${e(item?.term || "表达已不可用。")}</p>${item ? `<p class="help-caption">适用情境：${e(item.meaning)}</p>` : ""}</div>`; }).join("")}</div>`);
}
async function memoryDetail(item) {
  await memoryDetailBase(item);
  const conflicts = rows(await api(`/api/memories/${encodeURIComponent(item.id)}/conflicts`));
  if (!$("#modal").open) return;
  $("#modal .modal-body").insertAdjacentHTML("beforeend",`<div class="memory-conflict-section"><h3 style="margin-bottom:10px">${conflicts.length ? "可能冲突的内容" : "未发现直接冲突"}</h3>${conflicts.length ? `<div class="source-list">${conflicts.map(record => `<div class="source-item"><small>${e(label(record.status))} · ${e(record.subject || label(record.kind))}</small><p>${e(record.content)}</p></div>`).join("")}</div>` : '<p class="help-caption">自动冲突检测只提供线索，仍需结合原始语境判断。</p>'}</div>`);
}

const toolRunNames = {pending:"待批准",running:"执行中",succeeded:"已完成",failed:"执行失败",unknown:"结果未知",rejected:"已拒绝",cancelled:"已取消"};
function toolRunLabel(status) { return toolRunNames[status] || status || "未知状态"; }
function toolRunTag(status) { return tag(toolRunLabel(status),status === "pending" || status === "unknown" ? "gold" : status === "failed" ? "red" : ["rejected","cancelled"].includes(status) ? "gray" : ""); }
function toolJSON(value,limit = 12000) {
  let text; try { text = typeof value === "string" ? value : JSON.stringify(value ?? {},null,2); } catch { text = "无法显示此项内容。"; }
  return text.length > limit ? `${text.slice(0,limit)}\n…内容过长，已截断展示。` : text;
}
function mcpArray(settings = state.settings) { return (settings.mcp_servers || []).map(item => { const clean = {...item}; delete clean.token; delete clean.token_set; return clean; }); }
function mcpDiscoveryKey(server) { return `${server.id}|${server.url}`; }
function mcpServerCard(server,status) {
  const discovered = state.mcpDiscoveries?.[mcpDiscoveryKey(server)], allowed = server.allowed_tools || [];
  return `<article class="mcp-server-card"><div class="record-card-head"><div><h3>${e(server.name)}</h3><p class="mcp-server-address mono">${e(server.url)}</p></div>${tag(server.enabled ? "已启用" : "已停用",server.enabled ? "" : "gray")}</div><div class="provider-flags">${tag(server.token_set ? "令牌已保存" : "未配置令牌","gray")}${tag(`允许 ${allowed.length} 个工具`,"gray")}${tag(status.configured === false ? "配置不完整" : "逐次审批","gold")}</div>${status.last_error ? `<p class="provider-error">${e(status.last_error)}</p>` : `<p class="help-caption">${status.last_checked_at ? `最近发现 · ${e(fmt(status.last_checked_at))} · ${number(status.tools_count)} 个工具` : "尚未发现工具。点击下方按钮才会连接这个服务。"}</p>`}<div class="record-actions">${button("发现工具（联网）","discover-mcp","small","search",`data-id="${e(server.id)}"`)}${button("编辑服务","edit-mcp","ghost small","edit",`data-id="${e(server.id)}"`)}<button class="icon-button push-right" data-action="delete-mcp" data-id="${e(server.id)}" aria-label="删除扩展服务">${icon("trash")}</button></div>${discovered ? `<form data-form="mcp-allowlist" class="mcp-allowlist"><input type="hidden" name="server_id" value="${e(server.id)}"><h4>哪些工具可以提出调用请求？</h4><p class="help-caption">选择仅允许模型提出请求。每一次实际执行，仍需你在本地批准。</p>${discovered.message ? `<p class="help-caption">${e(discovered.message)}</p>` : ""}<div class="mcp-discovered-list">${discovered.tools.length ? discovered.tools.map(tool => `<label class="mcp-tool-option"><input type="checkbox" name="allowed_tools" value="${e(tool.name)}" ${allowed.includes(tool.name) ? "checked" : ""}><span><strong>${e(tool.name)}</strong><small>${e(String(tool.description || "服务未提供工具说明。").slice(0,800))}</small><details><summary>参数格式</summary><pre>${e(toolJSON(tool.inputSchema,8000))}</pre></details></span></label>`).join("") : '<p class="help-caption">这个服务没有返回可用工具。</p>'}</div>${allowed.some(name => !discovered.tools.some(tool => tool.name === name)) ? '<p class="help-caption text-danger">部分已允许工具不在本次发现结果中，保存后会移除这些旧名称。</p>' : ""}<div class="section-actions"><button class="btn primary small" type="submit">保存允许列表</button></div></form>` : allowed.length ? `<div class="mcp-allowed-names"><small>已允许提出请求</small>${allowed.map(name => tag(name,"gray")).join("")}</div>` : ""}</article>`;
}
function toolRunCard(run) {
  const pending = run.status === "pending" && !run.read_only, expired = pending && run.expires_at && new Date(run.expires_at).getTime() <= Date.now();
  return `<article class="tool-run-card ${pending ? "awaiting" : ""}"><div class="record-card-head"><div><h3>${e(run.tool_name)}</h3><p>${e(run.server_name || run.server_id)} · ${e(run.user_id || "owner")}</p></div>${run.read_only ? tag("恢复历史 · 只读","gray") : toolRunTag(run.status)}</div><pre class="tool-argument-preview">${e(toolJSON(run.arguments,1800))}</pre><div class="record-meta"><span>${e(fmt(run.created_at,true))}</span><span>${(run.source_ids || []).length} 条来源</span>${pending && run.expires_at ? `<span>${expired ? "已超过审批有效时间" : `审批有效至 ${e(fmt(run.expires_at,true))}`}</span>` : ""}</div>${run.error ? `<p class="provider-error">${e(String(run.error).slice(0,1800))}</p>` : ""}${run.status === "unknown" ? '<p class="help-caption text-danger">服务可能已执行，但结果未确认。请先在目标服务核对，避免重复操作。</p>' : ""}<div class="record-actions">${pending ? button(expired ? "查看过期请求" : "审核本次调用","review-tool-run","primary small","shield",`data-id="${e(run.id)}"`) + button("拒绝","reject-tool-run","ghost small","",`data-id="${e(run.id)}"`) : button("查看详情与结果","tool-run-detail","small","file",`data-id="${e(run.id)}"`)}</div></article>`;
}
async function renderToolsBase() {
  const scopeId = state.scope, [settings,status,runs] = await Promise.all([api("/api/settings"),api("/api/mcp/status"),api(`/api/tool-runs?${query({scope_id:scopeId,status:state.filters.status})}`)]);
  state.settings = settings; state.mcpStatus = status; state.toolRuns = rows(runs); state.toolRunsScope = scopeId;
  const servers = settings.mcp_servers || [], statuses = status.servers || [], pending = state.toolRuns.filter(run => run.status === "pending" && !run.read_only).length, current = scope();
  return heading("A LITTLE HELP, ON YOUR TERMS","扩展工具","连接你选择的 MCP 服务。先看清工具与参数，再决定是否执行。",button("添加工具服务","new-mcp","primary","plus")) + `<section class="tool-intro"><div class="tool-intro-copy"><div class="eyebrow">CONNECT · PROPOSE · APPROVE</div><h2>每一步，都由你决定。</h2><p>模型可以提出请求；实际调用需要本地管理员逐次批准。服务收到该次调用的参数，执行结果与任务继续状态保存在记录中；需要新的操作时会再次请求确认。</p></div><div class="tool-intro-steps"><div><span>01</span><strong>连接服务</strong><small>显式发现，选择允许工具</small></div><div><span>02</span><strong>检查请求</strong><small>核对参数与来源消息</small></div><div><span>03</span><strong>批准一次</strong><small>执行记录留在当前会话</small></div></div></section><section class="panel tool-scope-panel"><div><h3>${e(current.name)} · 扩展工具权限</h3><p>${current.allow_mcp && current.allow_tools !== false ? "此会话可以提出扩展工具请求，全部等待审批。" : current.allow_mcp ? "扩展工具已开启，但工具总开关关闭，无法提出请求。" : "此会话尚未允许提出扩展工具请求。"}${current.enabled === false ? " 会话已停用。" : ""}</p></div>${button("调整会话权限","edit-scope","small","settings",`data-id="${e(current.id)}"`)}</section><section class="tools-section"><div class="tools-section-head"><div><h2>我的工具服务</h2><p>支持 Streamable HTTP 的 JSON 响应。最多 8 个服务。</p></div>${tag(`${servers.length} / 8`,"gray")}</div>${servers.length ? `<div class="mcp-server-grid">${servers.map(server => mcpServerCard(server,statuses.find(item => item.id === server.id) || {})).join("")}</div>` : empty("tools","添加你需要的扩展工具","填写 HTTPS 或本机 HTTP 地址。添加后手动发现工具，选择哪些工具可以提出调用请求。","new-mcp","连接第一个工具服务")}</section><section class="tools-section"><div class="tools-section-head"><div><h2>调用审批与记录</h2><p>当前会话 · ${e(scopeName(scopeId))}。执行中状态请点击刷新查看。</p></div>${button("刷新状态","refresh","ghost small","refresh")}</div><div class="toolbar tool-run-toolbar"><div class="tool-pending-count">${icon("shield")}<span>${pending ? `${pending} 项请求等待你确认` : "本页当前筛选中没有待批准请求"}</span></div><div class="filter-tabs">${[["","全部"],["pending","待批准"],["running","执行中"],["succeeded","已完成"],["unknown","结果未知"],["failed","失败"],["rejected","已拒绝"],["cancelled","已取消"]].map(([key,title]) => `<button class="filter-tab ${(state.filters.status || "") === key ? "active" : ""}" data-action="filter" data-status="${e(key)}">${e(title)}</button>`).join("")}</div></div>${state.toolRuns.length ? `<div class="tool-run-grid">${state.toolRuns.map(toolRunCard).join("")}</div>` : empty("shield","每次调用，都有一份清楚的记录","开启会话权限并允许工具后，在聊天里提出请求。模型需要调用扩展工具时，待批准记录会出现在这里。")}</section><p class="help-caption">当前不支持 stdio 进程或原始 SSE 传输。发现工具会连接指定服务并读取工具目录；批准执行会向它发送本次参数。</p>`;
}
async function renderTools() {
  const html = await renderToolsBase(), status = state.mcpStatus || {};
  if (!status.warning && !status.suspended) return html;
  return `<section class="tool-state-warning">${notice(status.warning || "工具记录已隔离，扩展调用暂停。其他功能可继续使用。","warning")}${status.suspended ? `<div class="section-actions">${button("审阅后恢复扩展调用","resume-tool-runs","","shield")}</div>` : ""}</section>` + html;
}
function mcpModal(item = null) {
  if (!item && (state.settings.mcp_servers || []).length >= 8) { toast("最多配置 8 个扩展服务，请先调整现有配置。",true); return; }
  const id = item?.id || `mcp-${Date.now().toString(36)}`;
  openModal(item ? "编辑工具服务" : "连接一个工具服务","保存服务地址后，点击“发现工具（联网）”读取工具目录。",`<input type="hidden" name="id" value="${e(id)}"><div class="form-grid">${field("name","服务名称",item?.name || "","text","例如：个人笔记、日程服务。","required data-full maxlength=\"100\"")}${field("url","MCP 服务地址",item?.url || "","url","支持 Streamable HTTP 的 JSON 响应；HTTPS 或本机 HTTP。","required data-full placeholder=\"http://127.0.0.1:3000/mcp\"")}${field("token","Bearer Token（可选）","","password",item?.token_set ? "已保存，留空保持原值。" : "按服务要求填写，仅保存在本机，不回显。","data-full autocomplete=\"new-password\"")}</div>${toggle("enabled","启用这个服务","启用后，允许列表中的工具可供模型提出请求。",item?.enabled ?? false)}${item?.token_set ? toggle("clear_token","清除已保存令牌","保存后移除现有令牌。",false) : ""}${notice("所有扩展工具调用均需本地逐次批准。保存配置不会发现工具，也不会执行任何调用。")}`,"mcp-server",item);
}
async function saveMcpServer(form) {
  const data = getForm(form), fresh = await api("/api/settings"), servers = mcpArray(fresh), index = servers.findIndex(server => server.id === data.id), previous = index >= 0 ? servers[index] : null;
  if (data.name.trim().length > 80) throw new Error("服务名称请控制在 80 个字符以内。");
  if (data.clear_token && data.token) throw new Error("清除令牌和填写新令牌请选择一项。");
  const changedTarget = previous && previous.url !== data.url.trim(), record = {id:data.id,name:data.name.trim(),url:data.url.trim(),enabled:data.enabled,allowed_tools:changedTarget ? [] : previous?.allowed_tools || []};
  if (data.token) record.token = data.token;
  if (data.clear_token) record.clear_token = true;
  if (index < 0) servers.push(record); else servers[index] = record;
  await api("/api/settings",{method:"PUT",body:{mcp_servers:servers}});
  if (state.mcpDiscoveries && previous) delete state.mcpDiscoveries[mcpDiscoveryKey(previous)];
  closeModal(); toast(changedTarget ? "服务地址已更新，允许列表已清空，请重新发现工具。" : "服务配置已保存，请按需发现工具。" ); await bootstrap();
}
async function discoverMcp(target) {
  const id = target.dataset.id, server = (state.settings.mcp_servers || []).find(item => item.id === id); if (!server) return;
  target.disabled = true; target.innerHTML = '<span class="spinner small"></span>正在连接服务…';
  try { const result = await api("/api/mcp/discover",{method:"POST",body:{server_id:id}}); state.mcpDiscoveries ||= {}; state.mcpDiscoveries[mcpDiscoveryKey(server)] = {tools:rows(result.tools),message:result.message}; toast(result.message || `已发现 ${rows(result.tools).length} 个工具，请选择允许列表。`); await renderPage(); }
  finally { target.disabled = false; }
}
async function saveMcpAllowlist(form) {
  const data = new FormData(form), id = String(data.get("server_id")), fresh = await api("/api/settings"), servers = mcpArray(fresh), server = servers.find(item => item.id === id);
  if (!server) throw new Error("这个服务已被删除，请刷新后重试。");
  const discovery = state.mcpDiscoveries?.[mcpDiscoveryKey(server)]; if (!discovery) throw new Error("服务配置已变化，请重新发现工具。");
  server.allowed_tools = [...new Set(data.getAll("allowed_tools").map(String))].filter(name => discovery.tools.some(tool => tool.name === name));
  if (server.allowed_tools.length > 50) throw new Error("每个服务最多允许 50 个工具，请减少勾选。");
  await api("/api/settings",{method:"PUT",body:{mcp_servers:servers}}); toast("允许列表已保存。每次执行仍需单独批准。"); await bootstrap();
}
async function toolRunModal(id,review = false,requestedScope = state.scope) {
  const records = rows(await api(`/api/tool-runs?${query({scope_id:requestedScope})}`)), run = records.find(item => item.id === id);
  if (!run) throw new Error("这项调用记录已不可用，请刷新后重试。");
  const messages = rows(await api(`/api/messages?${query({scope_id:run.scope_id,limit:200})}`)), pending = review && run.status === "pending" && !run.read_only, expired = run.expires_at && new Date(run.expires_at).getTime() <= Date.now();
  const sourceIds = run.source_ids || [], sources = sourceIds.map(sourceId => messages.find(message => message.id === sourceId));
  const body = `${run.read_only ? notice("这是备份恢复的只读历史，不会再次执行，也不会作为新的办事依据。") : ""}<div class="tool-review-summary">${toolRunTag(run.status)}<dl class="detail-table"><dt>目标服务</dt><dd>${e(run.server_name || run.server_id)}</dd><dt>工具名称</dt><dd class="mono">${e(run.tool_name)}</dd><dt>会话</dt><dd>${e(scopeName(run.scope_id))}</dd><dt>请求用户</dt><dd>${e(run.user_id)}</dd><dt>创建时间</dt><dd>${e(fmt(run.created_at,true))}</dd>${run.expires_at ? `<dt>审批有效至</dt><dd>${e(fmt(run.expires_at,true))}</dd>` : ""}</dl></div><h3 class="tool-review-heading">本次参数</h3><pre class="tool-review-json">${e(toolJSON(run.arguments,Number.MAX_SAFE_INTEGER))}</pre><h3 class="tool-review-heading">来源消息</h3><p class="help-caption">展示最近 200 条中仍可读取的来源；服务执行时会收到上方参数。</p><div class="source-list">${sourceIds.length ? sourceIds.map((sourceId,index) => { const source = sources[index]; return `<div class="source-item"><small>${e(source ? `${source.user_id} · ${fmt(source.created_at)}` : sourceId)}</small><p>${e(source?.content || "原始消息已删除，或不在最近可读取范围内。")}</p></div>`; }).join("") : '<p class="help-caption">这项请求没有返回聊天来源。</p>'}</div>${pending ? notice(expired ? "本次请求已超过审批有效时间。请在对话里重新提出请求。" : "批准后会向目标服务发送上述参数并执行一次。执行结果仅在本地查看，不会自动发到 QQ。","warning") : ""}${run.result !== undefined && run.result !== null ? `<h3 class="tool-review-heading">服务返回结果</h3><pre class="tool-review-json">${e(toolJSON(run.result))}</pre>` : ""}${run.error ? `<div class="inline-error">${e(String(run.error).slice(0,6000))}</div>` : ""}${run.status === "unknown" ? notice("结果未确认，服务可能已经执行。请先核对目标服务记录，避免重复操作。","warning") : ""}`;
  openModal(pending ? "核对后，批准本次调用" : "工具调用记录",pending ? "请确认目标、参数和来源符合你的意图。" : "展示实际执行状态与服务返回内容。",body,pending && !expired ? "approve-tool-run" : "",run,"批准并执行一次");
  $("#modal").classList.add("modal-wide");
}
async function approveToolRun(form) {
  const run = state.modalRecord; if (!run) throw new Error("请重新打开调用请求。");
  const submit = $('[type="submit"]',form); if (submit) submit.innerHTML = '<span class="spinner small"></span>执行中，请稍候…';
  const result = await api(`/api/tool-runs/${encodeURIComponent(run.id)}/approve`,{method:"POST",body:{}}), record = result.run || result;
  state.pendingToolNotice = null;
  closeModal(); toast(`本次调用：${toolRunLabel(record.status)}。请查看记录。`,["failed","unknown"].includes(record.status)); await bootstrap(); await toolRunModal(run.id,false,run.scope_id);
}

document.addEventListener("click",async event => {
  const pageButton = event.target.closest("[data-page]");
  if (pageButton) { event.preventDefault(); await navigate(pageButton.dataset.page); return; }
  const target = event.target.closest("[data-action]"); if (!target || target.disabled) return;
  const action = target.dataset.action, id = target.dataset.id, item = state.records.find(record => record.id === id);
  try {
    if (await window.MikubotPages.handleAction(action,target)) return;
    if (await window.MikubotExperience.handleAction(action,target)) return;
    if (await window.MikubotQuickStart.handleAction(action,target)) return;
    if (await window.MikubotFeatures.handleAction(action,target)) return;
    if (action === "close-modal") { closeModal(); return; }
    if (action === "refresh") { await bootstrap(); toast("数据已刷新"); }
    else if (action.startsWith("go-")) await navigate(action.slice(3));
    else if (action === "setup") showWizardModal();
    else if (action === "skip-wizard") { sessionStorage.setItem("qunyu-wizard-skipped","1"); closeModal(); }
    else if (action === "qq-settings") { await navigate("settings"); $("#qq-section")?.scrollIntoView({behavior:"smooth",block:"start"}); }
    else if (action === "filter") { state.filters.status = target.dataset.status; await renderPage(); }
    else if (action === "culture-mode") { state.cultureMode = target.dataset.mode; state.filters = {}; await renderPage(); }
    else if (action === "new-expression") expressionModal();
    else if (action === "edit-expression" && item) expressionModal(item);
    else if (action === "analyze-expressions") { target.disabled = true; try { const result = await api("/api/expressions/analyze",{method:"POST",body:{scope_id:state.scope}}); toast(result.message || `返回 ${(result.candidates || []).length} 条表达候选`); state.cultureMode = "expressions"; state.filters.status = "pending"; await bootstrap(); } finally { target.disabled = false; } }
    else if (action === "new-provider") providerModal();
    else if (action === "new-mcp") mcpModal();
    else if (action === "edit-mcp") mcpModal((state.settings.mcp_servers || []).find(value => value.id === id));
    else if (action === "resume-tool-runs") await confirmAction("恢复扩展工具调用？","损坏的工具记录已隔离。恢复后可以提出新请求，每次执行仍须批准；隔离记录不会被重新执行。",async () => { await api("/api/tool-runs/resume",{method:"POST"}); },"恢复扩展调用");
    else if (action === "go-persona-knowledge") await navigate("personaKnowledge");
    else if (action === "explore-persona") await explorePersona(target);
    else if (action === "delete-persona-knowledge") await confirmAction("删除这条人格知识？","删除后停止用于回答，同一公开来源也不会被定期探索自动恢复。",async () => { await api(`/api/knowledge/${encodeURIComponent(id)}`,{method:"DELETE"}); },"删除知识");
    else if (action === "discover-mcp") await discoverMcp(target);
    else if (action === "delete-mcp") await confirmAction("删除这个工具服务？","移除配置和已保存令牌。该服务的工具将不能继续提出请求，执行记录仍保留。",async () => { const fresh = await api("/api/settings"); await api("/api/settings",{method:"PUT",body:{mcp_servers:mcpArray(fresh).filter(value => value.id !== id)}}); },"删除服务");
    else if (action === "review-tool-run") await toolRunModal(id,true);
    else if (action === "tool-run-detail") await toolRunModal(id);
    else if (action === "reject-tool-run") await confirmAction("拒绝这次工具调用？","本次请求不会发到目标服务执行。",async () => { await api(`/api/tool-runs/${encodeURIComponent(id)}/reject`,{method:"POST",body:{}}); state.pendingToolNotice = null; },"拒绝本次调用");
    else if (action === "edit-provider") providerModal((state.settings.providers || []).find(value => value.id === id));
    else if (action === "test-provider") { target.disabled = true; try { const result = await api("/api/model/test",{method:"POST",body:{provider_id:id}}); toast(result.ok ? `已保存配置连接成功 · ${result.latency_ms ?? "—"} ms` : result.message || "连接测试未通过",!result.ok); } finally { target.disabled = false; } }
    else if (action === "delete-provider") await confirmAction("删除这套模型配置？","相关任务将回到默认模型，并从备用顺序中移除此配置。已保存密钥一并删除。",async () => { const providers = providerArray().filter(value => value.id !== id),routing = {...(state.settings.routing || {})}; for (const key of Object.keys(routeNames)) if (routing[key] === id) routing[key] = ""; routing.fallback = (routing.fallback || []).filter(value => value !== id); await api("/api/settings",{method:"PUT",body:{providers,routing}}); },"删除配置");
    else if (action === "compact-context") await compactContext(target);
    else if (action === "context-sources") await contextSources();
    else if (action === "expression-sources") { const message = state.messages.find(value => value.id === id); if (message) await expressionSources(message); }
    else if (action === "review-memory" && item) await reviewMemory(item);
    else if (action === "reject-memory" && item) { await api(`/api/memories/${encodeURIComponent(id)}/reject`,{method:"POST"}); toast("这条候选不会进入记忆"); await bootstrap(); }
    else if (action === "search-memory-detail") { const record = rows(state.knowledgeResults).find(value => value.id === id); if (record) await memoryDetail(record); }
    else if (action === "show-profile") await showProfile();
    else if (action === "analyze-memory") await analyzeMemory(target);
    else if (action === "open-memory-candidates") { state.page = "memory"; state.filters = {status:"pending"}; localStorage.setItem("qunyu-page","memory"); renderNavigation(); await renderPage(); window.scrollTo(0,0); }
    else if (action === "jargon-evidence" && item) await showJargonEvidence(item);
    else if (action === "analyze-jargon") { target.disabled = true; try { toast("正在从最近聊天中分析群词候选…"); const result = await api("/api/jargon/analyze",{method:"POST",body:{scope_id:state.scope}}); toast(result.message || `发现 ${(result.candidates || []).length} 个待确认词条`); state.filters.status = "pending"; await bootstrap(); } finally { target.disabled = false; } }
    else if (action === "new-memory") memoryModal();
    else if (action === "edit-memory" && item) memoryModal(item);
    else if (action === "memory-detail" && item) await memoryDetail(item);
    else if (action === "archive-memory" && item) { await api(`/api/memories/${encodeURIComponent(id)}`,{method:"PUT",body:{status:item.status === "archived" ? "active" : "archived"}}); toast(item.status === "archived" ? "记忆已恢复" : "记忆已归档"); await bootstrap(); }
    else if (action === "delete-memory" && item) await confirmAction("删除这条记忆？","删除后它将不再参与回答，并留下删除记录。你也可以先归档。",async () => { await api(`/api/memories/${encodeURIComponent(id)}`,{method:"DELETE"}); },"删除记忆");
    else if (action === "new-jargon") jargonModal();
    else if (action === "edit-jargon" && item) jargonModal(item);
    else if (["approve-jargon","reject-jargon","toggle-jargon"].includes(action) && item) { await api(`/api/jargon/${encodeURIComponent(id)}`,{method:"PUT",body:{status:action === "approve-jargon" ? "approved" : action === "reject-jargon" ? "rejected" : item.status === "disabled" ? "approved" : "disabled"}}); toast("词条状态已更新"); await bootstrap(); }
    else if (action === "delete-jargon" && item) await confirmAction("删除这个词条？","删除后它不再参与理解或表达。",async () => { await api(`/api/jargon/${encodeURIComponent(id)}`,{method:"DELETE"}); },"删除词条");
    else if (action === "new-task") taskModal();
    else if (action === "edit-task" && item) taskModal(item);
    else if (action === "complete-task" && item) { await api(`/api/tasks/${encodeURIComponent(id)}`,{method:"PUT",body:{status:"completed"}}); toast("这件事，完成了 ✓"); await bootstrap(); }
    else if (["cancel-task","retry-task"].includes(action)) { await api(`/api/tasks/${encodeURIComponent(id)}/${action === "cancel-task" ? "cancel" : "retry"}`,{method:"POST"}); toast(action === "cancel-task" ? "任务已取消" : "任务已重新排队"); await bootstrap(); }
    else if (action === "new-persona") personaModal();
    else if (action === "edit-persona") personaModal(state.personas.find(p => p.id === id));
    else if (action === "use-persona") { await api(`/api/scopes/${encodeURIComponent(state.scope)}`,{method:"PUT",body:{persona_id:id}}); toast("当前会话已切换人格"); await bootstrap(); }
    else if (action === "delete-persona") await confirmAction("删除这个人格？","使用它的会话将回到默认人格。记忆与词典会保留。",async () => { await api(`/api/personas/${encodeURIComponent(id)}`,{method:"DELETE"}); },"删除人格");
    else if (action === "new-scope") scopeModal();
    else if (action === "edit-scope") scopeModal(state.scopes.find(s => s.id === id));
    else if (action === "toggle-scope") { const group = state.scopes.find(s => s.id === id); await api(`/api/scopes/${encodeURIComponent(id)}`,{method:"PUT",body:{enabled:!group.enabled}}); toast(group.enabled ? "会话已暂停" : "会话已启用"); await bootstrap(); }
    else if (action === "scope-chat") { state.scope = id; localStorage.setItem("qunyu-scope",id); await navigate("chat"); }
    else if (action === "attach-image") $("#image-input").click();
    else if (action === "remove-image") { state.images.splice(Number(target.dataset.index),1); renderImagePreviews(); }
    else if (action === "view-image") { openModal("对话图片","",`<img class="image-lightbox" src="${e(target.src)}" alt="对话原图">`); $("#modal").classList.add("modal-wide"); }
    else if (action === "chat-suggestion") { if ($("#chat-text")) { $("#chat-text").value = target.dataset.text; $("#chat-text").focus(); state.draft = target.dataset.text; } }
    else if (action === "cancel-chat") state.controller?.abort();
    else if (action === "clear-messages") await confirmAction("清空当前聊天记录？","已提取的记忆、词典和任务会保留。聊天来源可能因此无法展示。",async () => { await api(`/api/messages?${query({scope_id:state.scope})}`,{method:"DELETE"}); },"清空记录");
    else if (action === "message-sources") { const message = state.messages.find(m => m.id === id); if (message) await showSources(message); }
    else if (action === "test-model") await testModel(target);
    else if (action === "model-preset") { const form = target.closest("form"), provider = target.dataset.provider; $('[name="base_url"]',form).value = provider === "openai" ? "https://api.openai.com/v1" : provider === "deepseek" ? "https://api.deepseek.com/v1" : ""; $('[name="model"]',form).value = provider === "deepseek" ? "deepseek-chat" : ""; }
    else if (action === "list-models") { target.disabled = true; try { const result = await api("/api/models"), models = Array.isArray(result) ? result : result.models || result.data || []; $("#model-list").innerHTML = models.map(m => `<option value="${e(typeof m === "string" ? m : m.id)}">`).join(""); toast(`已读取 ${models.length} 个模型，请在模型名称中选择。`); } finally { target.disabled = false; } }
    else if (action === "qq-reconnect") { target.disabled = true; try { await api("/api/qq/reconnect",{method:"POST"}); toast("已请求重新连接"); await bootstrap(); } finally { target.disabled = false; } }
    else if (action === "test-official") { target.disabled = true; try { const form = target.closest("form"),data = getForm(form),result = await api("/api/qq/official/test",{method:"POST",body:{app_id:data.app_id,app_secret:data.app_secret || undefined}}); $("#qq-result").innerHTML = `<div class="result-block">${e(result.ok ? "官方凭据验证通过" : "验证未通过")}\n${e(result.message || result.detail || "")}</div>`; } finally { target.disabled = false; } }
    else if (action === "upload-note") $("#note-input").click();
    else if (action === "download-backup") { target.disabled = true; try { const response = await api("/api/backup",{raw:true}),blob = await response.blob(),url = URL.createObjectURL(blob),link = document.createElement("a"); link.href = url; link.download = `mikubot备份-${new Date().toISOString().slice(0,10)}.zip`; link.click(); setTimeout(() => URL.revokeObjectURL(url),30000); toast("完整备份已开始下载，工具历史恢复后只读；不包含密钥。"); } finally { target.disabled = false; } }
    else if (action === "shutdown") { await confirmAction("退出mikubot？","将停止本地服务，退出后提醒暂停。再次双击 mikubot.exe 即可启动。",async () => { await api("/api/shutdown",{method:"POST"}); state.stopped = true; $("#content").innerHTML = empty("stop","mikubot已退出","再次双击 mikubot.exe 即可启动 mikubot。提醒会在重新启动后继续处理。"); },"退出mikubot"); }
    else if (action === "restore-backup") $("#restore-input").click();
  } catch (error) { toast(error.message,true); }
});

document.addEventListener("submit",async event => {
  const form = event.target.closest("form[data-form]"); if (!form) return; event.preventDefault();
  const kind = form.dataset.form;
  if (kind === "chat") { await window.MikubotExperience.sendChat(form); return; }
  const submit = $('[type="submit"]',form); if (submit) submit.disabled = true;
  if ($("#modal-error",form)) $("#modal-error",form).hidden = true;
  try {
    if (await window.MikubotPages.handleSubmit(kind,form)) return;
    if (await window.MikubotExperience.handleSubmit(kind,form)) return;
    if (kind === "quick-start") { await window.MikubotQuickStart.submit(form); return; }
    if (await window.MikubotFeatures.handleSubmit(kind,form)) return;
    if (kind === "approve-tool-run") await approveToolRun(form);
    else if (kind === "mcp-allowlist") await saveMcpAllowlist(form);
    else if (kind === "confirm") { await state.confirm(); closeModal(); toast(state.stopped ? "mikubot已退出，可以关闭页面" : "操作已完成"); if (!state.stopped) await bootstrap(); }
    else if (kind === "memory-review") { await api(`/api/memories/${encodeURIComponent(state.modalRecord.id)}/approve`,{method:"POST",body:{replace_conflicts:getForm(form).replace_conflicts || false}}); closeModal(); toast("这段记忆，已经认真记住了"); await bootstrap(); }
    else if (kind === "culture-switches") { await api(`/api/scopes/${encodeURIComponent(state.scope)}`,{method:"PUT",body:getForm(form)}); toast("学习、理解与使用规则已保存"); await bootstrap(); }
    else if (kind === "expression-switches") { await api(`/api/scopes/${encodeURIComponent(state.scope)}`,{method:"PUT",body:getForm(form)}); toast("表达学习与使用规则已保存"); await bootstrap(); }
    else if (kind === "knowledge-search") { const values = getForm(form),searchedScope = state.scope; state.knowledgeQuery = values.q; state.knowledgeUser = values.user_id; const results = await api(`/api/memory/search?${query({scope_id:searchedScope,user_id:values.user_id,q:values.q})}`); state.knowledgeResults = {...results,scope_id:searchedScope}; await renderPage(); }
    else if (["model","wizard","qq","budget","system","memory-settings","routing","context-settings","identity","output","exploration","planner"].includes(kind)) await saveSettings(kind,form);
    else await saveModal(kind,form);
  } catch (error) { if (form.closest("dialog")) modalError(error.message); else toast(error.message,true); }
  finally { if (submit) submit.disabled = false; }
});
let searchTimer;
document.addEventListener("input",event => {
  window.MikubotPages.handleInput(event.target);
  window.MikubotExperience.handleInput(event.target);
  if (event.target.id === "record-search") { clearTimeout(searchTimer); const value = event.target.value,selection = event.target.selectionStart; searchTimer = setTimeout(async () => { state.filters.q = value; await renderPage(); const search = $("#record-search"); if (search) { search.focus(); search.setSelectionRange(selection,selection); } },350); }
  if (event.target.id === "chat-text") { state.draft = event.target.value; event.target.style.height = "auto"; event.target.style.height = Math.min(event.target.scrollHeight,180) + "px"; }
});
document.addEventListener("change",async event => {
  try { if (await window.MikubotPages.handleChange(event.target)) return; } catch (error) { toast(error.message,true); return; }
  try { if (await window.MikubotExperience.handleChange(event.target)) return; } catch (error) { toast(error.message,true); return; }
  if (event.target.id === "global-scope") { if (state.sending) { event.target.value = state.scope; toast("请等待当前回复，或先停止等待。",true); return; } state.scope = event.target.value; localStorage.setItem("qunyu-scope",state.scope); state.filters = {}; state.draft = ""; state.images = []; await renderPage(); }
  if (event.target.name === "adapter" && !window.MikubotQuickStart.adapterChanged(event.target)) updateAdapterFields();
  if (event.target.id === "knowledge-persona") { state.knowledgePersona = event.target.value; await renderPage(); }
  if (event.target.id === "image-input") {
    try { for (const file of [...event.target.files]) { if (state.images.length >= 3) throw new Error("一次最多附加 3 张图片。"); if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name} 超过 5 MB，请压缩后再发送。`); if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw new Error("支持 PNG、JPEG、WebP 与 GIF 图片。"); const data = await new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }); state.images.push({name:file.name,data}); } renderImagePreviews(); }
    catch (error) { toast(error.message || "图片读取失败",true); } finally { event.target.value = ""; }
  }
  if (event.target.id === "note-input" && event.target.files[0]) {
    const file = event.target.files[0]; event.target.value = "";
    try { if (file.size > 8 * 1024 * 1024) throw new Error("资料大小不能超过 8 MB。"); const data = new FormData(); data.append("file",file); data.append("scope_id",state.scope); toast("正在解析并导入本地资料…"); const result = await api("/api/files",{method:"POST",body:data}); toast(result.message || "资料已存入当前会话，可在知识页检索"); await bootstrap(); } catch (error) { toast(error.message,true); }
  }
  if (event.target.id === "restore-input" && event.target.files[0]) {
    const file = event.target.files[0]; event.target.value = "";
    await confirmAction("恢复这份备份？",`将使用「${file.name}」替换现有数据。恢复后自动回复暂停，所有连接密钥需要重新配置。建议先下载当前备份。`,async () => { const data = new FormData(); data.append("file",file); await api("/api/backup/restore",{method:"POST",body:data}); },"恢复并替换");
  }
});
document.addEventListener("keydown",event => {
  if (event.target.id === "chat-text" && event.key === "Enter" && !event.shiftKey && !event.isComposing) { event.preventDefault(); event.target.closest("form").requestSubmit(); }
});
$("#menu-toggle").addEventListener("click",() => { $("#sidebar").classList.toggle("open"); $("#sidebar-scrim").classList.toggle("open"); });
$("#sidebar-scrim").addEventListener("click",() => { $("#sidebar").classList.remove("open"); $("#sidebar-scrim").classList.remove("open"); });
$("#modal").addEventListener("cancel",event => { if (state.modalKind === "auth") event.preventDefault(); if (state.modalKind === "wizard") sessionStorage.setItem("qunyu-wizard-skipped","1"); });

(async function start() {
  await window.MikubotAuth.init(async () => { await bootstrap(true); });
})();
