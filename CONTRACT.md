# mikubot 0.1.0 集成约定

本文供源码开发与接入使用。运行时校验以 `qunyu/api.py`、`experience_api.py` 及对应服务为准；历史版本接口的行为不覆盖当前实现。程序模块名仍为 `qunyu`，产品名为 mikubot。

## 运行与认证

Python 3.12，FastAPI、SQLite；入口为 `python -m qunyu`，HTTP 应用为 `qunyu.api:create_app`。前端为 `qunyu/static` 中的 HTML/CSS/JS，无需用户构建。Windows 默认数据在 `%LOCALAPPDATA%\mikubot\data`，可用 `--data-dir` 指定位置；新默认目录全空时可复制旧版同级 `data`，不删除旧目录，不覆盖已有新数据。

管理服务默认监听 `127.0.0.1`，显式远程模式必须先配置密码。Windows 默认 WebView2 原生窗口；`--browser` 使用系统浏览器，`--no-browser` 后台运行。桌面与浏览器共用认证与管理 API；反向 WebSocket 另行验证 OneBot 密钥。JSON 错误通过 `detail` 返回。不会根据请求正文中自称管理员的字段授予权限。

启动器通过本机 URL 的 `#bootstrap=` 片段提供初始化证明，前端消费并清理；旧 `#token=` 仅作为相同证明兼容，不直接登录。`POST /api/auth/bootstrap {token}` 仅真正回环连接可换取短期 HttpOnly 初始化 Cookie；已有密码不能靠启动令牌绕过。内部 Bearer 凭据只用于本机控制，不属于远程 WebUI 登录。

- `GET /api/auth/status`：公开登录状态、设密状态；实际数据和密码文件路径只在经过初始化证明或已认证的本机请求返回。
- `POST /api/auth/setup {mode,password}`：`password` 或 `local_only`，首次或删文件后只能由本机初始化证明创建；`local_only` 同步关闭远程入口。
- `POST /api/auth/login {password}`：验证后设置 HttpOnly、SameSite 会话 Cookie；HTTPS 请求附 Secure。没有默认密码。
- `POST /api/auth/logout`：注销当前会话；`POST /api/auth/password {current_password,new_password}`：改密并使旧会话失效，仅本机免密首次设密使用本机授权流程。
- `GET/PUT /api/auth/access`：已认证读取或保存 `remote_enabled/host/port`；保存与实际监听分别返回，网络重绑定需要重启。关闭远程访问立即停止接受远程管理请求。

专用 `security/webui-password.json` 保存加盐 scrypt 校验值，Windows 外层 DPAPI 加密，非 Windows 使用私有权限；不保存明文，不纳入应用备份。完全退出后删除此文件并从本机重新打开可设新密码；旧会话不能复用，数据库与业务数据保留。损坏文件保持拒绝访问，不静默变为免密。

## 身份与电脑授权

`access.administrators` 存储 `platform`、`account_id`、`instance_id` 和备注。平台为 `onebot` 或 `qqofficial`；认证的本地 `mikubot` 管理员内置。填写实例 ID 时只匹配该机器人实例，留空的手填历史条目可匹配该平台同账号；短时码绑定保存实际实例。账号名、群身份和引用内容不构成凭据。

`AccessManager` 在本机或平台认证入口签发内部身份凭据，任务每一步、审批及继续时复核。私聊/群允许列表只控制聊天资格。普通用户可以使用允许的记忆、计算、待办等聊天工具，不获得本机电脑能力或配置管理权限。

## 新工作流接口

以下入口都需要本地管理台认证；QQ 任务另由连接器认证入口转交，禁止由 HTTP 请求冒充 QQ 身份。

- `/api/admins`：查看、添加管理员；`DELETE /api/admins/{id}` 移除，内置本地账户保留。
- `/api/admins/pairing`：创建短时码；`GET /api/admins/pairing/{id}` 查看候选；`POST .../confirm` 本地确认；`DELETE` 取消。私聊收到码只登记候选，不立即提权。
- `POST /api/qq/local/discover`、`connect`、`disconnect`：本机探测、鉴权配置和撤销。仅回环 WebUI 地址；不存储管理口令，配置写入前复核版本，不清空其他连接。保存和实际上线分别返回。
- `/api/jobs`、`/api/jobs/{id}`：任务列表与详情；`POST .../cancel` 停止；`POST .../approve` 要求当前单次 `approval_id`；`GET .../stream` 提供 SSE 进度。
- `POST /api/computer/jobs`：只接受本地会话，创建电脑任务；`GET /api/jobs/{id}/files/{index}` 下载成功任务的文件，检查目录与哈希。
- `POST /api/persona/distill/character/search`：搜索并保存待确认角色来源；`POST .../corpus` 上传解析材料；`POST .../start` 必须带已确认标记，创建后台蒸馏。
- `POST /api/persona/distill/{job_id}/trial`：无操作工具的草稿试聊；`POST .../apply` 另存人格；`GET .../artifact` 只允许角色模式下载 Skill。
- `POST /api/chat/attachments`：multipart `file`、`scope_id`、`purpose`，用途为 `context`、`memory` 或 `distillation`；不默认为长期记忆。普通参考附件最多 8MB。
- `POST /api/models`：使用当前表单配置读取模型列表；普通 `GET` 读取已保存配置。模型测试与列表读取按实际服务验证，不凭模型名推断工具或图片能力。
- `GET/POST /api/model-providers`、`PUT/DELETE .../{id}`：供应商连接目录；`POST .../discover` 或 `.../{id}/discover` 使用当前表单读模型目录，不保存未提交密钥。`legacy` 来源只读，原模型 ID 和密钥保留。
- `POST /api/model-catalog/models {provider_id,models}`：多选批量添加；`PATCH/DELETE .../models/{id}` 修改或删除模型；`PUT .../routing` 按用途选择模型。会话 `model_id:''` 继承全局聊天模型；在用模型删除需先解除路由和会话引用。
- `GET /api/logs?limit=200&level=...&q=...&after=...`：已认证增量日志，返回 `lines/cursor/reset`；`GET .../export` 下载脱敏文本。页面只在日志页轮询，不记录模型密钥或密码明文。

## 任务执行边界

任务保存在本地 `jobs.json`。状态为 `queued/running/awaiting_approval/completed/failed/cancelled/interrupted`；待批准动作绑定任务和单次审批 ID；QQ 使用 `/确认 <任务ID> <审批短码>`，旧审批短码不能批准下一步。关网页不停止任务，关闭程序则中断。重启、恢复历史和重复审批不得重放操作；不确定结果需人工检查。

电脑文件工具只能访问所选工作目录；路径穿越、链接和目录联接被拒绝。电脑能力开启且 `computer.approval_mode:'automatic'` 时，可信管理员明确发起的本机任务自动执行，文件写入、Shell、Python 不再逐步审批，保留每步权限检查、停止与结果记录。同一条件下，管理员在允许会话中的普通聊天 MCP 调用也会直接执行，仍校验服务与工具允许列表；电脑能力关闭或模式为 `per_action` 时逐次审批。Shell/Python 是当前账户权限的本机执行，不是沙箱；工作目录限制不能隔离命令对外部文件、系统或网络的影响。

人格/网页/附件是分析资料，不作为新的工具授权。角色研究只使用确认的来源快照，变更则重新确认。语料按目标说话者提炼，资料没有提供的信息保持未知；语料模式仅输出人设。

## 记忆、来源与备份

同会话与用户 ID 构成身份边界，不按昵称合并。共享空间只共享已确认、明确可共享的记忆。任何派生回复、关系或工具上下文必须检查来源、版本、撤权和暂停状态。

完整应用备份含数据库、脱敏设置、人格知识、只读工具与后台任务历史。恢复后暂停、断开通道、清除密钥，历史审批无效、操作不重放。原始语料、附件、Skill ZIP、电脑工作目录及任意用户文件不应被视为已随应用备份打包，需另行保留。

测试不连接用户真实 QQ，也不默认请求收费模型。真实模型回放必须显式开启，合成路由案例只验证回归路径，不证明智能质量。正式交付验证记录在 `TEST_REPORT.md`。
