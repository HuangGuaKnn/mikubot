"use strict";

window.MikubotExperienceChat={create(runtime,helpers){
  const {inactive,jobDetail}=helpers;
    async function renderChat() {
      const [messages,jobs,runs,modelControl] = await Promise.all([api(`/api/messages?${query({scope_id:state.scope})}`),api(`/api/jobs?${query({scope_id:state.scope})}`),api(`/api/tool-runs?${query({scope_id:state.scope,status:"pending"})}`),window.MikubotPages ? window.MikubotPages.chatModelControl() : ""]);
      state.messages = rows(messages); state.liveJobs = rows(jobs); state.toolRuns = rows(runs);
      const local = state.scope.startsWith("web:"), job = state.liveJobs.find(item => !inactive(item));
      if (runtime.attachmentScope !== state.scope) { runtime.attachments = []; runtime.attachmentScope = state.scope; }
      const pending = state.toolRuns.filter(item => item.status === "pending" && !item.read_only);
      return heading("CHAT","聊天","本地聊天默认每条回应。电脑任务需要管理员身份与独立开关。",button("后台任务","go-jobs","","tasks")) + (state.boot?.setup_required ? notice("尚未连接语言模型。你可以先使用记事、待办、计算和基础检索。","warning","quick-model","连接模型") : "") + `<div class="chat-workspace">${sessionSidebar()}<section class="chat-layout"><header class="chat-top"><div class="chat-identity"><div class="chat-avatar">ミ</div><div><h3>${e(personaName(scope().persona_id))}</h3><p>${e(scope().name)} · ${local ? "管理台管理员 mikubot" : "QQ 历史记录"}</p></div></div><div class="inline-stack">${modelControl}${button("人格","go-persona","ghost small","persona")}${button("清空","clear-messages","ghost small","trash")}</div></header>${!local ? '<div class="chat-scope-note scope-warning">QQ 记录在此只读。点击“新对话”即可在本地聊天，不会向 QQ 发信。</div>' : ""}<div class="chat-feed" id="chat-feed">${state.messages.length ? state.messages.map(renderMessage).join("") : `<div class="empty-state"><div class="chat-welcome-glyph">♪</div><h3>今天想聊什么？</h3><p>说说近况，放入一份资料，或交给我一件事情。</p>${local ? '<div class="chat-suggestions"><button data-action="chat-suggestion" data-text="你好，介绍一下你自己吧">认识初音未来</button><button data-action="chat-suggestion" data-text="记住：我喜欢喝抹茶">记住我的偏好</button><button data-action="chat-suggestion" data-text="添加待办：周末整理文档">添加待办</button></div>' : ""}</div>`}${state.sending ? '<div class="pending-message"><span class="spinner small"></span>正在处理你的消息…</div>' : ""}<div id="live-job-detail">${job ? jobDetail(job,true) : ""}</div></div>${pending.length ? `<section class="jobs-mini" aria-label="等待审批的工具请求"><strong>有 ${pending.length} 项工具请求等待确认</strong>${pending.map(toolRunCard).join("")}</section>` : ""}<form class="chat-composer" data-form="chat"><div class="image-previews" id="image-previews"></div><div id="attachment-chips" class="attachment-chips">${attachmentChips()}</div><textarea id="chat-text" name="text" placeholder="${local ? (state.chatMode === "computer" ? "例如：整理这份文档，或运行项目并帮我找出错误…" : "发消息，或把想完成的事交给我…") : "点击“新对话”开始本地聊天"}" aria-label="发送消息" rows="2" ${!local || state.sending ? "disabled" : ""}>${e(state.draft)}</textarea><div class="composer-bottom"><div class="composer-tools"><button class="icon-button" type="button" data-action="attach-image" title="添加图片" aria-label="添加图片" ${!local || state.sending ? "disabled" : ""}>${icon("image")}</button><button class="icon-button" type="button" data-action="attachment-options" title="上传资料" aria-label="上传资料" ${!local || state.sending ? "disabled" : ""}>${icon("file")}</button><label class="mode-picker">模式<select id="chat-mode" aria-label="聊天模式" ${!local || state.sending ? "disabled" : ""}><option value="chat" ${state.chatMode !== "computer" ? "selected" : ""}>普通聊天</option><option value="computer" ${state.chatMode === "computer" ? "selected" : ""}>电脑任务</option></select></label><span class="composer-hint">Enter 发送 · Shift + Enter 换行</span></div>${state.sending ? button("停止等待","cancel-chat","small","stop") : `<button type="submit" class="btn primary" ${!local ? "disabled" : ""}>发送 ${icon("send")}</button>`}</div></form></section></div><p class="help-caption">上传资料先选择用途。开启电脑任务后，管理员明确提出的任务会自动执行，可随时在任务卡片停止；普通 QQ 用户不能发起。</p>`;
    }

    function sessionSidebar() {
      const web = state.scopes.filter(item => item.id.startsWith("web:")), qq = state.scopes.filter(item => !item.id.startsWith("web:"));
      const row = item => `<button class="conversation-item ${item.id === state.scope ? "active" : ""}" data-action="scope-chat" data-id="${e(item.id)}" title="${e(item.name)}">${icon(item.id.startsWith("web:") ? "chat" : "groups")}<span>${e(item.name || "新对话")}</span></button>`;
      return `<aside class="conversations" aria-label="聊天会话">${button("新对话","new-chat","small","plus")}<p class="conversation-label">本地对话</p>${web.map(row).join("")}${qq.length ? `<p class="conversation-label">QQ 记录 · 只读</p>${qq.map(row).join("")}` : ""}</aside>`;
    }

    function attachmentChips() { return runtime.attachments.map((item,index) => `<span class="attachment-chip">${icon("file")}${e(item.name || item.filename || "资料")}<small>本次参考</small><button type="button" data-action="remove-attachment" data-index="${index}" aria-label="移除附件">×</button></span>`).join(""); }

    async function sendChat() {
      if (state.sending || !state.scope.startsWith("web:")) return;
      const text = $("#chat-text")?.value.trim() || "";
      if (!text && !state.images.length && !runtime.attachments.length) return;
      const scopeId = state.scope, payload = {scope_id:scopeId,text,images:state.images.map(item => item.data),attachments:runtime.attachments.map(item => item.id),mode:state.chatMode || "chat"};
      state.draft = text; state.sending = true; state.controller = new AbortController(); const controller = state.controller;
      await renderPage();
      try {
        const result = await api("/api/chat",{method:"POST",body:payload,signal:controller.signal});
        if (state.scope === scopeId) { state.draft = ""; state.images = []; runtime.attachments = []; }
        if (result.job) toast("电脑任务已创建，执行进度与结果会显示在当前聊天，可随时停止。");
        else if (result.pending_actions?.length) toast(`有 ${result.pending_actions.length} 项工具请求等待你确认。`);
      } catch (error) { toast(error.name === "AbortError" ? "已停止等待。后台任务请在任务页查看并停止。" : error.message,error.name !== "AbortError"); }
      finally { state.sending = false; state.controller = null; await bootstrap(); $("#chat-text")?.focus(); }
    }
  return {renderChat,sessionSidebar,attachmentChips,sendChat};
}};
