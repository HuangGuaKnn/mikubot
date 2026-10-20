"use strict";

window.MikubotUpdates = (() => {
  let status = null, selectedRelease = "", selectedKind = "", timer = null, busy = false, error = "";
  const labels = {installer:"Windows 安装版",portable:"Windows 便携版",source:"源码包"};
  const size = value => `${(Number(value || 0)/1024/1024).toFixed(1)} MB`;
  const safeReleaseUrl = value => /^https:\/\/github\.com\/iownmmiku\/mikubot\/releases(?:\/|$)/.test(value || "") ? value : "https://github.com/iownmmiku/mikubot/releases";
  const stop = () => { clearTimeout(timer); timer = null; };
  function selection() {
    const releases = status?.releases || [];
    if (!releases.some(item=>String(item.id)===selectedRelease)) selectedRelease=String(releases[0]?.id || "");
    const release=releases.find(item=>String(item.id)===selectedRelease);
    if (!release?.assets?.[selectedKind]) selectedKind=release?.assets?.[status.default_kind] ? status.default_kind : Object.keys(release?.assets || {})[0] || status?.default_kind || "source";
    return release;
  }
  function markup() {
    if (!status) return `<h2>版本与更新</h2><p>${e(error || "正在读取本地版本信息…")}</p>${button("重新读取","update-status","","refresh")}`;
    const release=selection(), download=status.download || {}, downloading=download.status==="downloading";
    const asset=release?.assets?.[selectedKind], disabled=busy || downloading ? " disabled" : "";
    const relation={newer:"较新版本",current:"当前版本",older:"历史版本"};
    const percent=Math.max(0,Math.min(100,100*Number(download.received || 0)/Math.max(1,Number(download.total || 0))));
    return `<div class="section-title">${icon("refresh")}<div><h2>版本与更新</h2><p>当前版本 ${e(status.current_version)} · ${{installed:"Windows 安装版",portable:"便携部署",source:"源码部署"}[status.mode] || "当前部署"}</p></div></div>
      <p class="help-caption">从 GitHub 的 iownmmiku/mikubot 读取已发布版本。不会自动下载、安装或切换版本。</p>
      <div class="section-actions">${button(busy ? "正在处理…" : "检查 GitHub 版本","update-check","primary","refresh",disabled)}<a class="btn ghost" href="${e(safeReleaseUrl(status.releases_url))}" target="_blank" rel="noopener noreferrer">GitHub 发行页面 ↗</a></div>
      <div class="toggle-field"><div class="toggle-copy"><strong>显示测试版</strong><small>包含标记为预发布的版本，默认关闭。</small></div><label class="switch"><input type="checkbox" id="update-prerelease" aria-label="显示测试版" ${status.include_prerelease ? "checked" : ""}${disabled}><span></span></label></div>
      ${status.checked_at ? `<p class="help-caption">上次检查：${e(fmt(status.checked_at))}。${!status.releases.length ? "本页没有符合筛选条件的发行版。" : "选择版本后查看说明和对应文件。"}</p>` : ""}
      ${release ? `<div class="form-grid">${select("update-release","选择发行版本",status.releases.map(item=>[String(item.id),`${item.tag} · ${relation[item.relation] || "发行版"}${item.prerelease ? " · 测试版" : ""}`]),selectedRelease,disabled)}${select("update-kind","下载类型",Object.keys(release.assets).map(kind=>[kind,labels[kind] || kind]),selectedKind,disabled)}</div>
      <p>${e(release.name)} · ${e(release.published_at ? fmt(release.published_at) : "发布日期未知")}</p>
      <details class="details"><summary>查看 ${e(release.tag)} 发行说明</summary><pre class="release-update-notes">${e(release.notes)}</pre><a href="${e(safeReleaseUrl(release.url))}" target="_blank" rel="noopener noreferrer">在 GitHub 查看此版本 ↗</a></details>
      ${release.relation==="older" ? notice("历史版本可以下载。请先备份数据，在独立目录手动部署；不支持直接覆盖降级。","warning") : ""}
      <p class="help-caption">${asset ? `${e(asset.name)} · ${size(asset.size)} · ${asset.verified_download_available ? "下载后校验 SHA-256" : "缺少校验信息，无法在软件内下载"}` : "此发行版没有对应文件。"}</p>
      ${button("下载所选版本","update-download","","download",`${disabled}${!asset?.verified_download_available ? " disabled" : ""}`)}` : ""}
      ${status.checked_at ? `<div class="section-actions">${status.page>1 ? button("上一页版本","update-previous","ghost small","",disabled) : ""}${status.has_more ? button("下一页版本","update-next","ghost small","",disabled) : ""}</div>` : ""}
      ${download.status!=="idle" ? `<div class="local-connector-result" aria-live="polite"><strong>${e(download.message || download.status)}</strong><p>${e(download.name || "")}</p>${downloading ? `<progress aria-label="版本下载进度" value="${percent}" max="100"></progress><p>${size(download.received)} / ${size(download.total)}</p>${button("取消下载","update-cancel","ghost small","stop")}` : ""}${download.status==="ready" ? `<a class="btn" href="${e(download.file_url)}" download>保存已校验文件</a> ${download.can_install && status.local_install_allowed ? button("退出并启动安装","update-install","primary","refresh") : `<p class="help-caption">${status.mode==="source" ? "请将源码包解压到新目录，按源码指南部署并继续使用原数据目录；当前源码与未提交改动不会被覆盖。" : status.mode==="portable" ? "请完整退出后将便携包解压到新目录，继续使用原数据目录。" : "请在运行电脑上手动安装；旧版本需先备份数据并检查兼容性。"}</p>`}` : ""}</div>` : ""}
      ${error ? notice(error,"warning") : ""}<p class="help-caption">下载保存在数据目录的 updates 文件夹。安装器保留独立的数据目录；升级前建议保存完整数据副本。</p>`;
  }
  function paint() { const node=$("#updates-section");if(node)node.innerHTML=markup(); }
  function schedule() {
    stop();
    if (!$("#updates-section") || !state.authenticated || status?.download?.status!=="downloading")return;
    timer=setTimeout(async()=>{try{if(!document.hidden){status=await api("/api/updates");paint();}}catch(exc){error=exc.message;paint();}finally{schedule();}},1000);
  }
  async function settingsPanel() {
    try {status=await api("/api/updates");error="";}catch(exc){error=exc.message;}
    return `<section class="panel settings-section section-anchor" id="updates-section">${markup()}</section>`;
  }
  async function action(action,target) {
    if (!action.startsWith("update-"))return false;
    if (action === "update-open") {
      openModal("版本与更新","检查、选择并下载 GitHub 上已发布的版本。",await settingsPanel());
      $("#modal").classList.add("modal-wide");schedule();return true;
    }
    if (busy) return true;
    if (action==="update-install") {
      const download=status?.download;
      if(!download?.can_install || !status.local_install_allowed)throw new Error("请在运行电脑上检查安装方式与下载状态。");
      await confirmAction("退出 mikubot 并启动安装？",`已校验 ${download.name}。程序将先退出，安装器等待退出完成后显示安装窗口；完成后继续使用当前数据目录。请先完成后台任务并保存数据副本。`,async()=>{
        await api('/api/updates/install',{method:'POST',body:{download_id:download.id}});stop();state.stopped=true;toast("安装器已启动，请在安装窗口继续。");
      },"退出并启动安装");
      return true;
    }
    busy=true;error="";paint();
    try {
      if(action==="update-status")status=await api('/api/updates');
      else if(action==="update-check" || action==="update-next" || action==="update-previous"){
        const page=action==="update-next" ? status.page+1 : action==="update-previous" ? status.page-1 : 1;
        status=await api('/api/updates/check',{method:'POST',body:{include_prerelease:!!status?.include_prerelease,page}});
      }else if(action==="update-download"){
        const release=selection();if(!release)throw new Error("请先检查并选择版本。");
        status=await api('/api/updates/download',{method:'POST',body:{release_id:release.id,kind:selectedKind}});
      }else if(action==="update-cancel")status=await api('/api/updates/cancel',{method:'POST',body:{}});
    }catch(exc){error=exc.message;}
    finally{busy=false;paint();schedule();}
    return true;
  }
  async function change(target) {
    if(target.name==="update-release"){selectedRelease=target.value;selectedKind="";paint();return true;}
    if(target.name==="update-kind"){selectedKind=target.value;paint();return true;}
    if(target.id==="update-prerelease"){
      const desired=target.checked, previous=status.include_prerelease;
      busy=true;error="";paint();
      try{status=await api('/api/updates/check',{method:'POST',body:{include_prerelease:desired,page:1}});}
      catch(exc){status.include_prerelease=previous;error=exc.message;}
      finally{busy=false;paint();schedule();}return true;
    }
    return false;
  }
  return {settingsPanel,handleAction:action,handleChange:change,afterRender:schedule,close:stop};
})();
