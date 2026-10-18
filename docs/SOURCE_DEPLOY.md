# mikubot 0.1.0 源码部署指南

源码版与 Windows 安装版使用同一套机器人核心、管理界面和数据格式。在 [GitHub Releases](https://github.com/iownmmiku/mikubot/releases/tag/v0.1.0) 下载 `mikubot-0.1.0-source.zip` 并完整解压，或克隆本仓库。源码运行无需 Git、Node 或前端构建工具，也不包含模型密钥或已登录的 QQ 客户端。

只想直接使用桌面软件时，选择同一页面的 `mikubot-0.1.0-Windows-Setup.exe`，无需准备 Python 环境。

## Windows：一条命令准备并启动

1. 安装 **Python 3.12**，保留 pip 与 venv 组件。其他 Python 版本暂不作为本版验收环境。
2. 完整解压源码包，进入包含 `requirements.txt` 的目录，打开 PowerShell。
3. 执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-source.ps1
```

脚本寻找 Python 3.12，创建项目内 `.venv`，安装固定版本的直接依赖，然后启动 mikubot。第一次打开后，设置登录密码，在快速入门添加供应商 API 地址与密钥、获取并选择聊天模型，即可开始聊天；QQ 与电脑能力可稍后设置。Windows 默认显示独立桌面窗口，需 WebView2 运行时；可以显式使用浏览器模式。首次安装依赖需要网络。脚本不安装系统 Python、不修改系统环境，也不清空用户数据。重复运行会复用虚拟环境；依赖文件没有变化时跳过重新安装。

如果 Python 没有加入 PATH，可指定完整路径：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-source.ps1 -Python 'C:\Python312\python.exe'
```

只准备环境，稍后再运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-source.ps1 -SetupOnly
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

选择数据目录和起始端口：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-source.ps1 -DataDir 'D:\mikubot-data' -Port 8765
```

Windows 默认数据目录是 `%LOCALAPPDATA%\mikubot\data`，独立于源码目录；显式 `--data-dir` 始终使用指定位置。默认数据目录全空且源码旁旧 `data` 有数据时，首次会复制旧目录，原目录保留；已有新数据不覆盖或合并。默认从本机 8765 端口开始寻找空闲端口，真实端口记录在数据目录的 `server.json` 中。

管理台默认仅监听 `127.0.0.1`。首次在运行电脑上设置管理密码，之后密码登录。启动器 URL 片段只提供短期本机初始化证明，不能绕过已设置的密码；不要分享该链接，也不要将本机令牌当远程登录密码。独立桌面窗口与浏览器入口使用相同保护。

## 日常启动、停止和修复环境

准备过环境后，在 PowerShell 运行 `powershell -ExecutionPolicy Bypass -File .\start.ps1`。它支持 `-DataDir`、`-Port`、`-BindHost`、`-Browser`、`-NoBrowser`、`-NoTray`、`-Stop`；端口不指定时读取已保存的网络设置，例如：

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1 -DataDir 'D:\mikubot-data' -NoBrowser -NoTray
```

也可以直接调用 Python，以下示例仅运行后台：

```powershell
.\.venv\Scripts\python.exe -m qunyu --data-dir 'D:\mikubot-data' --no-browser --no-tray
```

显式使用系统浏览器：

```powershell
.\.venv\Scripts\python.exe -m qunyu --data-dir 'D:\mikubot-data' --browser
```

PowerShell 启动脚本可使用 `powershell -ExecutionPolicy Bypass -File .\start.ps1 -Browser`。监听参数在脚本中叫 `-BindHost`，直接 Python 命令中叫 `--host`，以避开 PowerShell 自带的只读 `$Host` 变量。

关闭网页不会停止机器人。使用管理台“退出”、Windows 托盘“退出”，或发送安全停止请求：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-source.ps1 -Stop -DataDir 'D:\mikubot-data'
```

停止时务必选择启动时使用的数据目录。停止脚本只联系该目录记录且认证匹配的本地实例，不杀死其他 Python 进程，也不会为了停止而安装依赖。

依赖缺失或安装中断时，修复网络后重试；需要重新检查并安装直接依赖时使用：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-source.ps1 -Reinstall -SetupOnly
```

`-NoBrowser` 不自动打开界面，`-NoTray` 不创建托盘图标。Windows 默认桌面模式有托盘时关窗隐藏并继续工作，无托盘时关窗退出。控制台方式启动时保持进程运行，或使用你熟悉的进程管理器；安装版的 Windows 快捷方式由安装器创建，源码脚本不自动替你创建系统服务。

## 密码、远程 WebUI 与恢复

Windows 首次从运行电脑上的桌面或显式本机浏览器入口创建密码；远程请求只能在密码设定后登录，不能抢先创建或在删除文件后直接进入。没有默认密码。只需要本机时，可以显式选择“仅本机免密”，远程入口同步关闭。

密码文件在实际数据目录的 `security\webui-password.json`，保存加盐 scrypt 校验值，Windows 外层由当前账户 DPAPI 加密。密码不会写入浏览器存储或应用备份。修改密码会使其他设备的旧会话失效。

忘记密码：完全退出程序，只删除上述专用文件，再从运行电脑上的桌面客户端重新设置。程序会自动创建待初始化记录；数据库、聊天、记忆及模型配置保留。删除文件不会开放远程免密。保护数据目录权限，因为本机能修改该文件的账户可以执行恢复。

在设置“登录与远程管理”开启远程入口，配置监听地址与端口，保存并重启。也可以显式传入 `--host` 和 `--port`；非回环监听必须已经设置密码。远程设备使用运行电脑的实际 IP，不使用 `127.0.0.1` 或 `0.0.0.0`：

```powershell
.\.venv\Scripts\python.exe -m qunyu --data-dir 'D:\mikubot-data' --host 0.0.0.0 --port 8765 --no-browser --no-tray
```

先在本机完成密码设置，再使用以上命令。网络设置区分已保存和当前监听状态，需自行检查防火墙与地址可达性。HTTP 不加密传输；跨不可信网络部署使用 HTTPS 反向代理或加密隧道，不要直接公开裸 HTTP 管理端。反向代理域名需要加入允许的 Host 列表；不要无条件信任客户端伪造的转发头。

### 使用 HTTPS 反向代理

先从运行电脑的桌面窗口完成设密，再完全退出程序。编辑实际数据目录中现有 `settings.json` 的 `webui` 配置段，保留其他配置，例如：

```json
"webui": {
  "remote_enabled": true,
  "host": "0.0.0.0",
  "port": 8765,
  "allowed_hosts": ["bot.example.com"],
  "public_url": "https://bot.example.com"
}
```

以上是现有 JSON 对象中的一个配置段，不要用它替换整个设置文件。`allowed_hosts` 填域名，不带协议、端口或路径；`public_url` 必须是无路径、查询和片段的 HTTPS 入口，域名必须列入 `allowed_hosts`。若使用非默认 HTTPS 端口，`public_url` 与代理保留的 Host 都要包含该端口。

代理由你自行安装并配置有效 TLS 证书。以同机代理为例，HTTPS 入口是 `https://bot.example.com`，后端是 `http://127.0.0.1:8765`，请求 **Host 必须保留为 `bot.example.com`**，不要重写成 `127.0.0.1:8765`。域名和原始 Origin 与明确配置的 `public_url` 匹配后，登录会话使用 Secure Cookie；程序不通过 `X-Forwarded-For` 或 `X-Forwarded-Proto` 判断本机身份与可信 HTTPS 入口。

代理端应拒绝外部请求 `/api/auth/bootstrap`、`/api/auth/setup` 和兼容入口 `/api/session`，正常登录使用 `/api/auth/login`。不要把启动链接的 `#bootstrap=`、旧 `#token=`、`admin.token` 或本机初始化 Cookie 复制到远程配置、页面或链接中。远程页面只使用管理密码；本机初始化仍从桌面窗口完成。

防火墙只开放需要的 HTTPS 入口，并限制后端 8765 端口仅由代理访问；不要同时把后端裸 HTTP 端口公开。重启 mikubot 和代理后，从 HTTPS 域名登录，核对证书、登录和退出、任务进度与文件下载。这里提供配置约定，不替你申请域名、安装代理、签发证书或修改系统防火墙。

## 手动部署与 Python 包入口

也可以自行管理环境：

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m qunyu
```

项目提供 `pyproject.toml`。开发者可在独立虚拟环境中执行 `python -m pip install -e .`，随后通过 `mikubot` 命令启动。Windows 默认仍使用独立用户数据目录；需要固定迁移位置时，启动和停止都显式使用相同的 `--data-dir`。

## 升级及安装版迁移

1. 在原管理台导出完整备份，然后退出原实例。
2. 保存完整实际数据目录的副本。在新源码目录准备环境，或继续使用独立的原数据目录。
3. 使用相同 `--data-dir` 启动，检查人格、聊天、记忆与连接状态。
4. 不要让安装版和源码版同时写同一个数据目录。

源码脚本不删除旧文件，不执行数据库重置，也不自动替换你的 `.venv`。旧虚拟环境不是 Python 3.12 时，它会停止并提示；先保留数据，再手动换环境。

Windows 密钥由当前账户的 DPAPI 保护。同一 Windows 用户迁移数据目录通常可继续读取；换设备或系统账户后需要重新填写连接密钥。导出的完整备份经过脱敏，恢复后会暂停机器人、关闭连接并清除密钥，工具历史仅供查看，不自动重放电脑操作。原始蒸馏材料、聊天附件、生成的 Skill ZIP、文件修改前副本与电脑工作目录需另行保留，不应假定它们已包含在应用备份中。

## Linux 无头运行：实验路径

本版正式验收环境为 Windows。代码提供以下 Bash 启动脚本，**尚未在真实 Linux 系统完成安装、QQ 连接或电脑任务验收**：

```bash
bash scripts/setup-source.sh --setup-only
bash start.sh --data-dir "$PWD/data" --no-browser --no-tray
```

也可以一次准备并启动：

```bash
bash scripts/setup-source.sh --data-dir "$PWD/data"
```

脚本要求 Python 3.12 与可用的 `venv`、pip；不会自动安装发行版系统包。可以通过 `--python /path/to/python3.12` 或 `MIKUBOT_PYTHON` 选择解释器，`--reinstall` 重新安装依赖。停止使用 `bash start.sh --data-dir "$PWD/data" --stop`。

无浏览器环境中，保持服务只绑定回环地址，通过加密隧道在运行电脑侧完成首次设置，或先在有本机界面的环境初始化实际数据目录后再启动后台。`admin.token` 是本机启动与内部控制凭据，不是远程管理密码，不应复制到远程 URL 或暴露到网络。Linux 首次设密与远程部署的完整操作尚无真实系统验收。

非 Windows 环境的配置密钥目前采用 **Base64 编码，并非加密**，应由部署者保护数据目录和系统账户。Docker、WSL 及跨主机 QQ 自动配对未纳入本版验证范围；这些环境请使用手动连接地址，不要把容器自己的 `127.0.0.1` 当作宿主机地址。

## 不启动 QQ 的本地路由回归

```powershell
.\.venv\Scripts\python.exe -m qunyu --replay .\evals\routing-synthetic.json --replay-output .\replay-report.json
```

默认使用脚本模型、独立临时数据，不调用真实模型，也不发送 QQ 消息。真实模型回放必须另外显式开启，格式、费用与限制见 [回放说明](REPLAY-v0.6.md)。

## 构建源码发行包

开发者在项目根目录运行：

```powershell
.\.venv\Scripts\python.exe scripts/package_source.py
```

输出当前版本的 `dist/mikubot-<版本>-source.zip` 与同名 `.sha256`。包内采用白名单：程序和静态资源、CSP 资源与许可证、指南、回放集、测试、脚本及根目录元数据。不会遍历 `.venv` 或打包用户数据、`.qa-*`、`.git`、缓存、日志和运行密钥文件。包内 `SOURCE_MANIFEST.json` 记录每个文件的 SHA-256，便于核对；打包后代码再变更需要重新生成。

此源码包不含已编译 EXE。Windows 安装器和便携包的构建需要 `requirements-dev.txt` 中的工具，使用 `scripts/build.ps1`，具体构建与验证证据见发行测试报告。
