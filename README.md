# mikubot 0.1.0

本机运行的 AI 聊天机器人与任务助手。默认提供初音未来人格，支持独立聊天、QQ 接入、记忆、黑话学习、人格蒸馏和管理员电脑任务。

## 下载与选择

前往 **[GitHub Releases 下载 0.1.0](https://github.com/iownmmiku/mikubot/releases/tag/v0.1.0)**，展开 Assets，按用途选择：

| 文件 | 适合谁 | 使用方式 |
| --- | --- | --- |
| [mikubot-0.1.0-Windows-Setup.exe](https://github.com/iownmmiku/mikubot/releases/download/v0.1.0/mikubot-0.1.0-Windows-Setup.exe) | Windows 用户，推荐 | 双击安装，随后从快捷方式打开 |
| [mikubot-0.1.0-Windows-x64.zip](https://github.com/iownmmiku/mikubot/releases/download/v0.1.0/mikubot-0.1.0-Windows-x64.zip) | 希望解压即用 | 完整解压后双击 `mikubot.exe`，不要只取出 EXE |
| [mikubot-0.1.0-source.zip](https://github.com/iownmmiku/mikubot/releases/download/v0.1.0/mikubot-0.1.0-source.zip) | 希望运行或修改代码 | 安装 Python 3.12，按下方命令启动 |

安装版和便携版无需 Python、Node 或 Git，默认打开独立桌面窗口。它们不包含模型账号、API Key、QQ 客户端或 NapCat/SnowLuma，需要自行准备。模型调用按所选服务商规则计费。

## 第一次使用

1. **打开软件并设置密码**：首次在运行电脑上设置至少 8 个字符的登录密码。只在本机使用时，也可明确选择“仅本机免密”；此模式关闭远程入口。
2. **添加模型供应商**：在快速入门点击“添加供应商并选择模型”，填写服务商提供的 **API 地址** 和 **API Key**。地址以服务商文档为准，兼容接口通常以 `/v1` 结尾，不要填网页聊天地址。
3. **获取并选择模型**：读取模型列表，选一个并保存。快速入门会将它设为聊天模型；服务不提供列表接口时，可以手填准确的模型名。
4. **开始聊天**：打开“聊天”，新建对话，发送“你好”。首次不必配置 QQ、电脑能力或其他模型分工。

后续在“模型供应商”管理多个来源与模型，在聊天顶栏为单个会话切换模型。手动新增供应商只保存连接；还需选择“设为聊天模型”或指定本会话模型。只有实际支持工具调用、图片等能力的模型，才能使用对应功能。

桌面窗口依赖 Microsoft Edge WebView2 运行时。缺少组件时可按提示使用浏览器，或安装组件后重新打开；也可运行 `mikubot.exe --browser`。有托盘时关闭窗口会继续运行，从托盘选择“退出”才完全停止。

## 接入 QQ

### 本机 NapCat / SnowLuma

1. 自行启动连接器，完成 QQ 登录与必要的设备验证。
2. 在 mikubot 快速入门填写**允许私聊的账号或群号**，点击“保存名单并自动配对”。
3. 填入连接器的本机 WebUI 地址与管理口令；SnowLuma 多账号时选择实际使用的账号。
4. mikubot 会通过连接器管理接口创建专属**反向 WebSocket**。口令不保存，其他连接配置保留。
5. 等待页面显示实际在线，再用允许的账号或群发送测试消息。

默认探测 NapCat 的 `http://127.0.0.1:6099`、SnowLuma 的 `http://127.0.0.1:5099`，可手动修改。自动配对适用于本机回环地址；其他环境可展开手动配置，将页面显示的 `/onebot/v11/ws` 地址与相同 Access Token 填入连接器。扫码登录、连接器安装和初始化需要自行完成。

### QQ 官方机器人

在 QQ 开放平台申请应用，在“设置与连接”填写 AppID、AppSecret 并启用。官方机器人使用平台 OpenID，不能直接把普通 QQ 数字号填入 OpenID 名单；可用场景受平台权限与审核规则限制。

**在线但不回复时**：先看 QQ 设置中的“消息接收与回复”，确认是否收到消息、是否被名单或回复规则跳过；再打开“运行日志”检查模型与发送结果。详细排障见[使用指南](docs/USER_GUIDE.md#9-常见卡点)。

## 管理员与电脑任务

“允许聊天”和“管理员”分别设置。默认管理员 `mikubot` 代表通过管理台认证的本地账户；QQ 管理员可以添加多个，按平台真实发送者 ID 识别。昵称、群主身份、转发或引用不会授予权限。不确定账号标识时，可使用“绑定我的 QQ”：在本地生成配对码，由目标 QQ 私聊发送，回到管理台核对后确认。

在“设置与连接 → 电脑任务”开启能力、选择工作目录，然后在聊天中选择“电脑任务”，或由 QQ 管理员发送 `/执行 具体任务`。支持本机 Shell、Python、文件读取、搜索、新建与修改；默认自动执行，可在任务卡片停止。`/任务 任务编号` 查看进度，`/停止 任务编号` 停止。

**Shell/Python 使用当前系统账户权限，工作目录不是隔离沙箱。**只向可信管理员开放电脑能力。本版不提供鼠标键盘与屏幕截图循环；任务退出或重启后不会自动重跑。MCP 工具还受服务与工具允许列表约束；开启电脑能力且使用自动模式时，管理员的允许调用可连续执行。

## 其他功能

- **人格与表达**：默认初音未来，可编写名称、别名与人格；作品角色蒸馏输出人格和角色 Skill，已有语料蒸馏仅输出人设描写。生成后先预览、试聊，再应用。
- **记忆与资料**：默认会话隔离，支持显式共享已确认记忆、来源与纠错、遗忘、可选向量检索；附件可选本次参考、长期资料或人格蒸馏。
- **自然群聊与黑话**：Planner 判断消息对象和参与价值，决定回应或跳过；私聊可设必回复。黑话学习、理解和使用分别开关，自动候选可审核。
- **兴趣探索与任务**：可按兴趣收集公开资料、管理待办和提醒。自动探索默认关闭；提醒需要程序运行与通道在线。
- **运行日志**：支持级别筛选、搜索、暂停、复制和脱敏导出。报错时优先查看这里。

## 从源码运行

Windows 安装 **Python 3.12**，完整解压 `mikubot-0.1.0-source.zip`（或克隆本仓库）。在包含 `requirements.txt` 的目录打开 PowerShell：

```powershell
# 首次：创建 .venv、安装依赖并启动，下载依赖需要网络
powershell -ExecutionPolicy Bypass -File .\scripts\setup-source.ps1
```

之后启动或停止：

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1
powershell -ExecutionPolicy Bypass -File .\start.ps1 -Stop
```

需要指定数据目录时，首次、日常启动与停止都使用同一路径：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-source.ps1 -DataDir 'D:\mikubot-data'
powershell -ExecutionPolicy Bypass -File .\start.ps1 -DataDir 'D:\mikubot-data'
powershell -ExecutionPolicy Bypass -File .\start.ps1 -DataDir 'D:\mikubot-data' -Stop
```

源码运行无需 Node、Git 或前端构建。只准备环境使用 `-SetupOnly`；显式浏览器模式使用 `-Browser`。手动 Python 部署、HTTPS 反代、修复环境与实验性 Linux 运行见[源码部署指南](docs/SOURCE_DEPLOY.md)。Python 模块目录沿用 `qunyu`，运行 `python -m qunyu` 是正常的。

## 数据、密码与远程管理

Windows 默认数据在 **`%LOCALAPPDATA%\mikubot\data`**，独立于程序目录；替换或移除程序时可保留。聊天、记忆、配置与运行日志使用这份数据；显式 `--data-dir` 时以实际指定路径为准。

专用密码文件是数据目录中的 **`security\webui-password.json`**：保存加盐 scrypt 校验值，Windows 外层再由当前账户 DPAPI 加密。忘记密码时，完全退出 mikubot，只删除此文件，再从运行电脑打开并重新设密；聊天与记忆保留，旧登录失效。不要删除整个数据目录。换设备或 Windows 账户后，连接密钥可能需要重新填写。

默认只监听本机。需要其他设备访问时，先设置密码，再在“登录与远程管理”启用入口、保存并重启，使用运行电脑的真实 IP 与端口登录。仅本机免密不接受远程访问。普通 HTTP 不加密传输；跨不可信网络使用 HTTPS 代理或加密隧道，具体 Host 与代理要求见[部署说明](docs/SOURCE_DEPLOY.md#使用-https-反向代理)。不要分享启动链接中的本机初始化凭据。

升级前退出旧实例并保留完整数据副本，避免多个实例同时写一份数据。应用备份会脱敏，不包含有效密码与密钥；恢复后需重新配置连接。原始附件、蒸馏材料和电脑工作目录应另行备份。

## 文档与验证范围

- [完整使用指南](docs/USER_GUIDE.md)：密码、模型、QQ、管理员、电脑任务、人格与常见问题；软件内也可打开“使用指南”。
- [源码部署指南](docs/SOURCE_DEPLOY.md)：环境、启动参数、迁移与远程部署。
- [测试报告](TEST_REPORT.md)：实际检查与限制。
- [发布说明](RELEASE_NOTES.md)：本次发行内容。

正式桌面目标为 Windows。QQ 使用模拟连接器与本地消息链路回归，仍需在你的账号与连接器环境验收；不把模拟通过视为真实 QQ 登录或模型质量验证。Linux、Docker、WSL 尚未完成真实环境验收。mikubot 未附赠付费模型服务。
