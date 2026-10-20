# 群屿 0.4.0 验收记录

日期：2026-10-16（UTC+8）。Windows 11 x64，Python 3.12.14，Node 24.18.0。

## 完整回归

原生Windows用户环境：**354项通过**，12.94秒（`.qa-native-v4-final`）。前端 `node --check` 通过。Starlette TestClient有一条httpx2迁移弃用提示，未阻断测试。

保留此前201项存储、记忆、知识、QQ、任务、上下文、表达、模型路由、密钥与备份回归。新增测试覆盖：

- MCP初始化、版本协商、工具分页、JSON/SSE分块与编码、1MB响应界限、参数Schema及指纹；认证不泄漏、DNS地址固定、无代理／重定向、拒私网／非法地址。
- 单次工具POST、超时／未知不重试、清理session不改变真实结果，拒引用／正则／异步工具参数。
- 提议不执行、并发／重复批准、目录失效、审批过期、服务／允许列表／模型工具开关变化、握手期间撤权。
- 删除原文、记忆、词条与改换请求后的旧审批取消，真实ASGI网页新请求代际；启动pending取消、running未知。
- 令牌DPAPI保护、按ID保留／清除、秘密作为字典键及短秘密不破坏记录结构，新旧备份恢复清令牌停服务。
- 旧版已复现的生成期间QQ撤群／停连接／换适配器／官方撤权、清请求原文／删上下文依赖，在工具入口阻止副作用。
- 内置工具拒错误类型和额外字段；HTTP400撤掉tools参数后拒未授权tool_calls；有界转义JSON。
- 内置工具已完成而后续模型预算失败时仍保留执行回执；查询按会话／请求人过滤，来源删除后退出查询。

## 浏览器与本地协议验收

独立应用 `.qa-v4-browser` 端口18789；独立本地协议与模型替身 `scripts/qa_mcp_fixture.py` 端口18790，测试内容及数据不进入发行包。

浏览器完成登录、停用服务显式发现、选择允许工具、启用服务与会话扩展权限、聊天模型提议、来源／参数审批、批准与回执。批准前测试便笺不存在，批准后只写1条；重复审批HTTP400且文件仍1条。前端控制台无错误。截图位于 `docs/approval-v0.4.jpg`、`docs/receipt-v0.4.jpg`、`docs/tools-v0.4.jpg`。

替身通过真实localhost HTTP运行2025-11-25握手及工具调用；不代表生产第三方MCP或真实模型质量。无需真实凭据，不联系外网或QQ账号。

## 便携包

窗口模式PyInstaller构建，包含jsonschema规范资源、许可证、静态界面及说明。独立EXE与最终ZIP解压运行检查通过：启动／鉴权／密钥保护／持久化／单实例／正常退出、知识解析、记忆冲突、路由、表达、摘要状态及MCP配置／执行记录接口。另在独立EXE上通过真实localhost HTTP完成发现→模型提议→管理员批准→回执→重复批准HTTP400，验证冻结包内Schema资源和MCP模块可运行。用户数据不进入ZIP。

## 验证边界

没有用户真实模型、QQ账号和第三方生产MCP服务，未做竞品盲测、干净Windows矩阵、长期压力或正式安全审计。工具协议和替身语义通过不能证明真实回答质量或所有MCP服务兼容。尚未代码签名。

旧版报告保存在 `docs/TEST_REPORT-v0.3.md`。数据库schema仍为1；工具记录独立本地保存，不进入数据库备份。

## 复现

```powershell
.\.venv\Scripts\python.exe -m pytest -q -p no:cacheprovider --basetemp .qa-fresh-v4
node --check qunyu/static/app.js
powershell -File scripts/build.ps1
.\.venv\Scripts\python.exe scripts/smoke_portable.py dist/v0.4.0/Qunyu/Qunyu.exe --data-dir .qa-fresh-portable-v4 --port 18791
```

DPAPI须正常Windows账户运行。便携测试使用全新目录，不调用真实外部服务；需要重复本地HTTP审批闭环时，先运行 `scripts/qa_mcp_fixture.py --data-dir .qa-fresh-fixture --port 18790`，便携命令附加 `--mcp-fixture-url http://127.0.0.1:18790`。替身不随发行包分发。
