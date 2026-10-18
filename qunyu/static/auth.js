"use strict";

// Passwords and startup proofs live only in the current request. Authentication
// uses the server's HttpOnly cookie; no credential is written to browser storage.
window.MikubotAuth = (() => {
  let status = {}, ready = async () => {}, working = false;
  const escape = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const node = () => document.getElementById("auth-root");
  async function request(path, body, method) {
    const response = await fetch(path, {method:method || (body === undefined ? "GET" : "POST"),credentials:"same-origin",headers:body === undefined ? {} : {"Content-Type":"application/json"},body:body === undefined ? undefined : JSON.stringify(body)});
    let data = {}; try { data = await response.json(); } catch {}
    if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : data.error || `请求失败（${response.status}）`);
    return data;
  }
  const password = (name, title, autocomplete = "current-password") => `<div class="field"><label for="auth-${name}">${escape(title)}</label><input id="auth-${name}" name="${name}" type="password" autocomplete="${autocomplete}" required minlength="8" maxlength="256"></div>`;
  function recovery() {
    const files = status.password_file ? `<p>密码文件：<code>${escape(status.password_file)}</code></p>${status.data_dir ? `<p>数据目录：<code>${escape(status.data_dir)}</code></p>` : ""}` : "<p>在运行 mikubot 的电脑上打开桌面客户端，查看数据目录中的 <code>security/webui-password.json</code>。</p>";
    return `<details class="auth-recovery"><summary>忘记密码怎么办？</summary>${files}<ol><li>完全退出 mikubot，包括托盘中的程序。</li><li>只删除专用密码文件 <code>security/webui-password.json</code>。</li><li>重新打开桌面客户端，在运行电脑上设置新密码。</li></ol><p>聊天、记忆和模型配置会保留；旧登录会话失效。不要删除整个数据目录。</p></details>`;
  }
  function screen(error = "") {
    const target = node(); if (!target) return;
    document.body.classList.remove("auth-ready");
    document.getElementById("modal")?.close();
    const setup = status.setup_required || status.mode === "setup";
    let title = "登录 mikubot", description = "输入你的管理密码，继续聊天与管理机器人。", content;
    if (status.mode === "error") {
      title = "密码文件暂时无法读取"; description = "请在运行 mikubot 的电脑上检查数据目录。";
      content = `<p class="auth-note">${escape(status.error || "密码文件无效或无法解密。请使用原 Windows 账户启动，或按下方步骤重设密码。")}</p>${recovery()}`;
    } else if (setup && !status.local_setup_allowed) {
      title = "先在运行电脑上设置密码"; description = "管理密码还没有设置。";
      content = '<p class="auth-note">请在运行 mikubot 的电脑上，从桌面客户端完成首次密码设置，再回来登录。远程页面不能创建或重设管理员密码。</p><button class="btn primary auth-submit" data-auth-action="refresh">我已设置，重新检查</button>' + recovery();
    } else if (setup) {
      title = "为 mikubot 设置密码"; description = "第一次使用，先保护你的聊天、记忆和电脑任务。";
      content = `<form data-auth-form="setup">${password("password","设置密码","new-password")}${password("confirm_password","再次输入密码","new-password")}<p class="help-caption">至少 8 个字符。没有默认密码；密码以不可逆校验值保存，并在 Windows 上由当前账户加密保护。</p><button type="submit" class="btn primary auth-submit">设置密码并进入</button></form><details class="auth-local-choice"><summary>只在这台电脑使用，不设置密码</summary><p>选择后关闭远程管理入口，仅允许本机回环访问。本机其他能使用此电脑的人也可以进入管理台。</p><form data-auth-form="local-only"><label class="auth-check"><input type="checkbox" name="confirmed" required>我只在本机使用，并关闭远程访问</label><button type="submit" class="btn auth-submit">启用仅本机免密</button></form></details>${recovery()}`;
    } else if (status.mode === "local_only" || status.local_only) {
      title = "仅本机访问已开启"; description = "远程管理入口已关闭。";
      content = '<p class="auth-note">请在运行 mikubot 的电脑上打开桌面客户端。需要从其他设备管理时，先在本机设置密码并开启远程访问。</p><button class="btn auth-submit" data-auth-action="refresh">重新检查</button>';
    } else {
      content = `<form data-auth-form="login">${password("password","管理密码")}<button type="submit" class="btn primary auth-submit">登录</button></form>${recovery()}`;
    }
    target.innerHTML = `<main class="auth-page"><section class="auth-card" aria-labelledby="auth-title"><div class="auth-brand"><span class="miku-mark" aria-hidden="true">m<span>♪</span></span><strong>mikubot<span>.</span></strong></div><h1 id="auth-title">${escape(title)}</h1><p class="auth-description">${escape(description)}</p><p class="auth-error" role="alert" ${error ? "" : "hidden"}>${escape(error)}</p>${content}</section><p class="auth-footer">你的数据，留在运行 mikubot 的电脑上。</p></main>`;
    target.hidden = false; target.querySelector('input[type="password"]')?.focus();
  }
  async function enter() {
    if (node()) { node().hidden = true; node().innerHTML = ""; }
    document.querySelectorAll?.('[data-auth-action="logout"]').forEach(item => { item.hidden = status.mode === "local_only" || status.local_only === true; });
    document.body.classList.add("auth-ready"); await ready();
  }
  async function refresh() {
    status = await request("/api/auth/status");
    if (status.authenticated) await enter(); else screen();
    return status;
  }
  async function init(callback) {
    ready = callback;
    try {
      const fragment = new URLSearchParams(location.hash.slice(1)), token = fragment.get("bootstrap") || fragment.get("token");
      if (token) {
        history.replaceState(null,"",location.pathname + location.search);
        // Startup proof is accepted only by the loopback bootstrap endpoint;
        // it does not bypass an already configured password.
        await request("/api/auth/bootstrap", {token});
      }
      await refresh();
    } catch (error) { screen(error.message); }
  }
  async function requireLogin() {
    try { status = await request("/api/auth/status"); } catch { status.authenticated = false; }
    screen();
  }
  async function settingsPanel() {
    const [next,access] = await Promise.all([request("/api/auth/status"),request("/api/auth/access")]); status = next;
    const local = status.mode === "local_only" || status.local_only;
    const actualRemote = status.actual_remote_enabled ?? access.actual_remote_enabled ?? status.remote_enabled;
    const urls = status.urls || access.urls || [];
    const network = `<form data-auth-form="network" class="security-network-form"><h3>从其他设备打开 WebUI</h3><label class="auth-check"><input type="checkbox" name="remote_enabled" ${access.remote_enabled ? "checked" : ""}>开启远程管理入口</label><p class="help-caption">需要先设置管理密码。仅本机免密不能与远程入口同时开启。网络设置保存后重启生效。</p><div class="form-grid"><div class="field"><label for="auth-host">监听地址</label><input id="auth-host" name="host" value="${escape(access.host || "0.0.0.0")}" required placeholder="0.0.0.0"><small>0.0.0.0 接受本机各网卡连接，也可指定本机局域网 IP。</small></div><div class="field"><label for="auth-port">端口</label><input id="auth-port" name="port" type="number" min="1" max="65535" value="${escape(access.port || status.port || 8765)}" required></div></div><p class="help-caption">其他设备使用运行电脑的实际 IP 地址，不要输入 0.0.0.0。HTTP 不加密传输；跨不可信网络请使用 HTTPS 反向代理或加密隧道。</p><button class="btn" type="submit">保存网络入口</button><p class="auth-form-error" role="alert" hidden></p></form>`;
    return `<section class="panel settings-section section-anchor" id="webui-security-section"><div class="section-title"><div><h2>登录与远程管理</h2><p>桌面客户端与浏览器共用管理密码。远程登录拥有同样的管理权限。</p></div></div><div class="info-pair"><span>访问方式</span><strong>${local ? "仅本机免密" : "密码保护"}</strong></div><div class="info-pair"><span>当前远程入口</span><strong>${actualRemote ? "已开启" : "已关闭"}</strong></div>${status.restart_required || access.restart_required ? '<p class="auth-restart">网络设置已保存，重启 mikubot 后生效。</p>' : ""}${urls.length ? `<p class="help-caption">当前入口：<br>${urls.map(url=>`<code>${escape(url)}</code>`).join("<br>")}</p>` : ""}${status.listen_host || access.actual_host ? `<p class="help-caption">实际监听：<code>${escape(status.listen_host || access.actual_host)}:${escape(access.actual_port || status.port || "")}</code></p>` : ""}<form data-auth-form="change-password" class="security-password-form">${local ? "" : password("current_password","当前密码")}${password("new_password",local ? "设置管理密码" : "新密码","new-password")}${password("confirm_password","再次输入新密码","new-password")}<button class="btn primary" type="submit">${local ? "设置密码" : "修改密码"}</button><p class="auth-form-error" role="alert" hidden></p></form><p class="help-caption">修改密码后，其他设备的旧会话立即失效。密码不会随应用备份导出。</p>${network}${recovery()}${local ? "" : '<div class="section-actions"><button class="btn" data-auth-action="logout">退出当前登录</button></div>'}</section>`;
  }
  async function submit(form) {
    const kind = form.dataset.authForm, data = Object.fromEntries(new FormData(form));
    if ((kind === "setup" || kind === "change-password") && (data.password || data.new_password) !== data.confirm_password) throw new Error("两次输入的密码不一致。");
    if (kind === "login") await request("/api/auth/login",{password:data.password});
    else if (kind === "setup") await request("/api/auth/setup",{password:data.password,mode:"password"});
    else if (kind === "local-only") { if (!data.confirmed) throw new Error("请先确认只在本机使用。"); await request("/api/auth/setup",{mode:"local_only"}); }
    else if (kind === "change-password") await request("/api/auth/password",{current_password:data.current_password || "",new_password:data.new_password});
    else if (kind === "network") { await request("/api/auth/access",{remote_enabled:!!data.remote_enabled,host:data.host,port:Number(data.port)},"PUT"); form.reset(); await refresh(); return; }
    form.reset(); await refresh();
    if (kind === "change-password" && window.toast) window.toast("密码已更新，其他设备需要重新登录。");
  }
  document.addEventListener("submit",async event => {
    const form = event.target.closest("form[data-auth-form]"); if (!form) return;
    event.preventDefault(); event.stopImmediatePropagation(); if (working) return;
    working = true; const submitButton = form.querySelector('[type="submit"]'); if(submitButton)submitButton.disabled=true;
    try { await submit(form); }
    catch (error) { const errorNode = form.querySelector(".auth-form-error") || node()?.querySelector(".auth-error"); if (errorNode) { errorNode.hidden=false;errorNode.textContent=error.message; } }
    finally { working = false; if(submitButton)submitButton.disabled=false; }
  });
  document.addEventListener("click",async event => {
    const target = event.target.closest("[data-auth-action]"); if(!target)return;
    event.preventDefault(); if(working)return; working=true;
    try {
      if(target.dataset.authAction === "logout") { await request("/api/auth/logout",{}); window.MikubotExperience?.close(); window.MikubotPages?.close(); }
      await refresh();
    } catch(error) { screen(error.message); }
    finally { working=false; }
  });
  return {init,requireLogin,settingsPanel,refresh,recovery,screen,getStatus:()=>({...status})};
})();
