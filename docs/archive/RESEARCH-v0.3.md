# 群屿 0.3：学习官方机制后的实现取舍

核对日期：2026-10-15。以下链接为官方文档或官方代码；仅研究机制，群屿独立实现，不包含竞品代码复制。没有竞品盲测，不能据功能增加宣称实际智能超越。

| 官方优势与来源 | 群屿本轮落地 | 保持易用的取舍 |
| --- | --- | --- |
| [AstrBot 模型提供商](https://docs.astrbot.app/en/providers/llm.html)：配置多服务、命名模型、测试后安排使用 | 默认模型保留；增加最多20个命名配置、五类用途路由、显式备用和运行状态 | 仍使用兼容 Chat Completions 与 Embeddings；暂不增加多种供应商原生协议 |
| [MaiBot 模型配置](https://docs.mai-mai.org/manual/configuration/model-config)：planner、replyer 等组件按用途安排模型 | 分开接话判断、最终回答、记忆／语言学习和摘要的模型用途 | 基础接话以本地规则完成，可选语义门控限频调用，不要求先购买多模型 |
| [AstrBot 上下文压缩](https://docs.astrbot.app/use/context-compress.html)：旧内容摘要、近期完整轮次保留、长度复核 | 有界增量摘要、保留近期原文、来源指纹和记忆／语言版本依赖 | 不伪造历史消息；失败保留有效原文并给出原因；长单轮仍可能超出模型限制 |
| [MaiBot 聊天与回复](https://docs.mai-mai.org/faq/chat-and-reply)：规划是否参与、动态消息与有限打断 | reply/wait/skip 规划、话题／热度／近期回应线索，同成员新请求与停止抑制旧回复和未开始工具 | 规划可解释；不运行持续自主思考循环，不承诺理解所有群聊情境 |
| [MaiBot 表达学习](https://docs.mai-mai.org/manual/configuration/bot-config#表达学习)：表达与黑话分开，学习／使用分别控制 | 独立表达候选、多人多次证据、人工审核、每条允许采用、按语境选择 | 默认不学习、不采用；只保留简短可复用措辞，不模仿成员身份 |
| [MaiBot 事件记忆实现](https://github.com/Mai-with-u/MaiBot/blob/475a4b8c2f00bc25bb771179726b669708645658/src/services/memory_flow_service.py)：增量处理，事件证据 | 摘要按人物、时间、共同话题、约定和未完成事项组织；来源失效时撤销派生记录 | 摘要是事件背景，事实仍走原有候选／冲突／更正流程 |

0.2 已研究的 [LivingMemory](https://github.com/lxfight-s-Astrbot-Plugins/astrbot_plugin_livingmemory) 提供了记忆可管理、可修订的参考方向，群屿继续保留显式记忆、候选审核、证据、版本和遗忘阻断。0.3 将这些约束扩展到长对话摘要和表达来源。

AstrBot 的插件／MCP 生态与 MaiBot 的完整 A_Memorix、持续规划系统还有更大范围。本轮先完成稳定的主对话流程，尚未实现插件市场、MCP任意工具接入或完整语义关系图。模型质量、真实群节奏与第三方平台权限仍需使用者的实际模型及QQ环境验收。
