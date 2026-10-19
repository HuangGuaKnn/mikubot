# mikubot 源码部署指南

当前工作区是尚未发布的0.1.1源码。GitHub现有源码ZIP与安装包尚未更新；本指南中的新功能需使用当前源码。完整的隔离、HTTPS、Linux/Docker步骤与验收限制见[部署与安全说明](DEPLOYMENT_AND_SAFETY.md)。

## Windows：一条命令准备并启动

安装 **Python 3.11–3.13（推荐3.12）**，保留pip和venv。在源码根目录打开PowerShell：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-source.ps1
```

首次需要网络，脚本创建`.venv`、安装`requirements-desktop.txt`，然后打开独立桌面窗口。无需Git、Node或前端构建。WebView2缺失或加载失败自动回退默认浏览器。

```powershell
# 只准备环境；解释器也可用 -Python 指定完整路径
powershell -ExecutionPolicy Bypass -File .\scripts\setup-source.ps1 -SetupOnly
# 日常启动、显式浏览器模式与安全停止；始终使用同一数据目录
powershell -ExecutionPolicy Bypass -File .\start.ps1 -DataDir 'D:\mikubot-data'
powershell -ExecutionPolicy Bypass -File .\start.ps1 -DataDir 'D:\mikubot-data' -Browser
powershell -ExecutionPolicy Bypass -File .\start.ps1 -DataDir 'D:\mikubot-data' -Stop
```

默认数据目录为`%LOCALAPPDATA%\mikubot\data`，独立于源码和安装目录。脚本不覆盖数据、不替换不兼容虚拟环境；依赖损坏可用`-Reinstall -SetupOnly`。`-NoBrowser -NoTray`为纯后台；`-Port`指定端口，`-BindHost`指定监听网卡。关闭网页不会停止后台程序，有托盘时关闭窗口也可继续运行。

## 手动部署与 Python 包入口

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-desktop.txt
.\.venv\Scripts\python.exe -m mikubot --data-dir 'D:\mikubot-data'
```

无头服务改装`requirements-server.txt`并附加`--no-browser --no-tray`，不要求GUI或.NET。也可`pip install -e .`安装核心、`pip install -e ".[desktop]"`加入Windows桌面依赖。正式包名为`mikubot`，旧`qunyu`导入与启动入口兼容，数据库`qunyu.db`不改名。

## Linux 与 Docker

```bash
bash scripts/setup-source.sh --setup-only
.venv/bin/python -m mikubot --data-dir "$HOME/mikubot-data" --init-password
bash start.sh --data-dir "$HOME/mikubot-data"
```

支持Python3.11–3.13；先在终端交互设密，再启动服务。默认监听回环，远程需要HTTPS。Docker构建、首次密码、持久卷、代理与容器内QQ地址见[Linux/Docker部署步骤](DEPLOYMENT_AND_SAFETY.md#docker-服务部署)。本机没有Linux或Docker引擎，本次未完成这些环境的真实启动验收。

## 使用 HTTPS 反向代理

远程访问默认要求HTTPS。在“登录与远程管理”填写自己的HTTPS域名，生成Caddy配置，完成有效证书与代理部署。只允许可信TCP代理提供的HTTPS转发头，保留公网Host；容器桥接需明确配置固定代理IP。详细配置见[HTTPS步骤](DEPLOYMENT_AND_SAFETY.md#使用-https-反向代理)。监听地址/端口修改后需重启。

可信局域网需要原始HTTP时，明确勾选“允许明文HTTP”或传入`--allow-http-lan`，该选择会保存；HTTP不加密密码和聊天，不直接公开后端端口。仅本机免密不能同时启用远程入口。

## 密码、数据与恢复

首次在桌面设密；无头使用`--init-password`。忘记时用本机托盘“重置 WebUI 密码”，或：

```powershell
.\.venv\Scripts\python.exe -m mikubot --data-dir 'D:\mikubot-data' --reset-password
```

聊天和记忆保留，旧会话失效；无头随后再次`--init-password`。也可完全退出后仅删除`security/webui-password.json`，重开后重新设密。无HTTP重置入口。Windows密码校验值由DPAPI保护，其他系统使用scrypt与文件权限；跨系统需重新设密、填密钥。

升级前退出旧实例并完整备份数据。应用备份脱敏，不代替原始数据副本；原附件、蒸馏材料、检查点、Skill和工作目录另备。同一数据目录仍只允许单实例写入。

## 隔离、恢复与验收

新安装电脑任务默认选择Docker隔离，须先准备本机Linux容器引擎和`python:3.12-slim`；不可用就停止，不降级到宿主。旧本机模式保留；本机Shell/Python具有当前系统账户权限。文件工具和MCP与代码容器的边界见[隔离说明](DEPLOYMENT_AND_SAFETY.md#代码隔离与任务恢复)。

蒸馏任务支持按检查点继续；电脑命令不自动重放。真实本地网络回归、可选真实QQ/模型验收、Docker隔离脚本和持续集成矩阵见[验收入口](DEPLOYMENT_AND_SAFETY.md#验收入口)。替身通过不代表真实QQ账号、模型质量、Linux/Docker或公网证书验收通过。

默认不调用真实模型的回放命令：

```powershell
.\.venv\Scripts\python.exe -m mikubot --replay .\evals\routing-synthetic.json --replay-output .\replay-report.json
```

真实模式显式开启后可能计费，见[回放说明](REPLAY-v0.6.md)。源码发行白名单已同步部署文件、核心与兼容包；本次没有重建安装包、提交、推送或发布。以后获准构建时使用`scripts/package_source.py`和`scripts/build.ps1`。

源码可在设置中选择GitHub发行版并下载源码包，但不会自动切换分支或覆盖工作区。更换代码请在新目录准备依赖，保持同一个`--data-dir`；详见[更新指南](UPDATES.md)。
