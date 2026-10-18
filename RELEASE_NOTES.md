# mikubot 0.1.0

首个公开发行版本，提供 Windows 安装版、便携版和源码包。版本号统一为 0.1.0，包含当前已完成的全部功能。

- 独立桌面窗口与可选 WebUI；首次设置管理密码，支持明确的本机免密模式、密码恢复和独立数据目录。
- 本地聊天、NapCat、SnowLuma 和 QQ 官方机器人接入；本机自动配对、允许名单、多个管理员与消息收发诊断。
- 多供应商和模型目录、自动获取模型、会话模型选择与任务分工。
- 带来源与隔离的记忆、黑话与表达学习、Planner、人格公开知识及双模式人格蒸馏。
- 管理员明确开启电脑能力后连续执行文件、Python、Shell 和允许的工具，可查看记录并停止任务。
- 原创品牌图标，程序与安装器文件属性均显示 0.1.0。

## 下载后如何使用

Windows 用户推荐 `mikubot-0.1.0-Windows-Setup.exe`：双击安装，打开软件，设置登录密码，在快速入门填写模型服务地址与 API Key，获取并选定模型，再打开“聊天”。QQ 和电脑能力可稍后设置。模型账号、QQ 客户端和连接器需要自行准备。

便携版须完整解压 `mikubot-0.1.0-Windows-x64.zip` 后运行 `mikubot.exe`。源码部署使用 Python 3.12，解压 `mikubot-0.1.0-source.zip` 后在项目根目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-source.ps1
```

详细步骤见 [README](https://github.com/iownmmiku/mikubot/blob/v0.1.0/README.md) 与 [使用指南](https://github.com/iownmmiku/mikubot/blob/v0.1.0/docs/USER_GUIDE.md)。

Windows 数据默认位于 `%LOCALAPPDATA%\mikubot\data`，升级或移除程序时保留此目录。忘记密码的恢复步骤、管理员权限及远程访问说明均在指南中。Shell/Python 使用当前系统账户权限，工作目录不是隔离沙箱。

发布包附 SHA-256 校验、第三方声明和对应库源码。验证使用本地模型、QQ 与 MCP 协议替身，不代表已测试所有服务商或真实 QQ 环境。
