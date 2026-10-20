"use strict";

// Page functions use the shared authenticated shell; no page executes at load.
async function renderPersonas() {
  state.personas = rows(await api("/api/personas"));
  return heading("A CHARACTER OF ITS OWN","让它，有自己的样子。","温柔、活泼，或少说多做。集中管理人格，由机器人配置统一应用到聊天。",button("创造人格","new-persona","primary","plus")) + `<div class="record-grid">${state.personas.map(item => `<article class="record-card persona-card"><div class="record-card-head"><div><div class="persona-badge" style="color:${/^#[0-9a-f]{6}$/i.test(item.color || "") ? e(item.color) : "#7e9565"}">✳</div><h3>${e(item.name)}</h3></div>${scope().persona_id === item.id ? tag("当前会话使用") : ""}</div><p class="record-text">${e(item.description || "还没有写下人格介绍。")}</p><div class="persona-preview">${e(item.system_prompt || "尚未设置人格提示词")}</div><div class="record-actions">${button("设为默认人格","use-persona","primary small","",`data-id="${e(item.id)}"`)}${button("编辑人格","edit-persona","small","edit",`data-id="${e(item.id)}"`)}<button class="icon-button push-right" data-action="delete-persona" data-id="${e(item.id)}" aria-label="删除人格">${icon("trash")}</button></div></article>`).join("")}</div><p class="help-caption">人格负责表达方式；记忆和群词典按会话保存。切换人格不会清空共同经历。</p>`;
}

function personaModal(item = null) {
  openModal(item ? "打磨它的性格" : "创造一个新人格","给它稳定的性格、表达方式，以及对待人的态度。",`<div class="form-grid">${field("name","人格名称",item?.name || "","text","","required maxlength=\"100\"")}${field("color","代表颜色",/^#[0-9a-f]{6}$/i.test(item?.color || "") ? item.color : "#39c5bb","color")}${textarea("description","一句话介绍",item?.description || "","例如：温柔但有自己的想法，记得住小事。","maxlength=\"1000\"")}${textarea("system_prompt","人格与表达规则",item?.system_prompt || "","描述它怎样回应、怎样陪伴、什么时候少说。","required rows=\"7\" maxlength=\"6000\"")}${textarea("interests","兴趣主题",(item?.interests || []).join("\n"),"每行一个主题，例如动画、音乐。探索只使用这些公开主题，不发送聊天记录。","maxlength=\"1500\" rows=\"3\"")}</div>${toggle("exploration_enabled","允许这个人格定期探索","还需要在全局开启定期探索。新资料进入人格知识库，不自动发往聊天。",item?.exploration_enabled ?? false)}`,"persona",item);
  window.MikubotFeatures.personaExtras(item);
  $("#modal .modal-body").insertAdjacentHTML("afterbegin",`<div class="notice">${icon("spark")}<p>也可以从作品角色或已有语料生成一个人格草稿。</p><button type="button" data-action="start-distill">蒸馏人格</button></div>`);
}
