# 聊天回放与标注

默认脚本回归不联网。每个案例在独立临时聊天中运行，QQ发送器不创建，办事工具关闭。合成集只检验控制逻辑，结果不是智能评测。

```json
[{"id":"sample-1","scope_kind":"group","user_id":"alice","text":"大家有什么音乐推荐？","history":[{"user_id":"bob","text":"聊聊最近听的歌吧"}],"scope":{"activity":"balanced"},"expected":{"reply":true,"target_user_id":"alice","useful_contains":["音乐"]},"scripted_decision":{"action":"reply","intent":"交流音乐","reason":"开放提问","needed_info":["音乐"]},"scripted_reply":"可以聊聊音乐。"}]
```

expected.reply为人工标注；target_user_id为应回应对象。最多500案例，每例最多100条历史。导入真实聊天前自行去除无关隐私；真实模型模式会把所选案例发到配置模型。

```powershell
.\mikubot.exe --replay .\evals\routing-synthetic.json --replay-output .\replay-report.json
.\mikubot.exe --replay .\my-annotated.json --replay-live --replay-generate --data-dir .\data --replay-output .\live-report.json
```

第二条命令显式使用当前模型，会产生调用和可能费用；不自动执行。配置暂停时拒绝，整次回放应遵守累计预算及原当日已用量；报告独立保存，不写原聊天数据库或自动向QQ发送。

源码可用 `.venv\Scripts\python.exe -m qunyu.evaluation DATASET --output REPORT`；真实模式加 `--live --data-dir data --generate`。

报告的decision_accuracy/reply_precision/reply_recall/target_accuracy根据标注计算。usefulness_proxy仅是输出包含标注词的机械匹配，未填写时null。human_usefulness默认null，需人工审阅原输出后填写，不能把词匹配分数当作真实有用性。时延是本机单次实验值。要比较不同机器人，须相同案例/模型/配置、独立标注、足够重复，并报告失败、成本和样本局限。

预算采用读取原库时的当日快照，另扣本次回放累计消费；无法与正在运行的另一个进程跨进程原子共享余额，也不会把回放账单写回原库。重复执行新回放时需要自行考虑此前回放成本；报告保留本次实际或保守估算用量。
