# ASSERT-56 handoff — BF 告警通知与无人响应升级

## What changed

BF 自动开单后新增"分级 + 无人响应升级"链路(仅 BF)。

- `src/server/interpret.ts` — 解读模型在开单时多判一档 severity(low/urgent/critical,默认 urgent,critical 仅限服务对用户不可用);`splitSeverity()` 从首行取出。
- `src/server/ticket-platforms.ts` — `createTicket` 返回 `{url,id}`;新增 `issueComments()`(Linear GraphQL,读工单评论用于确认)。
- `src/server/twilio.ts`(新)— `placeCall()`:API Key 鉴权、POST Calls.json、Timeout 12s、Twiml 接通即挂、不录音/不放语音/不启用 AMD、只拨允许列表内号码。
- `src/server/escalation.ts`(新)— 配置读取、工作时间判定、critical 白天 0/15/30 阶梯、**非工作时间按周值班轮值重拨(`onCallIndex/onCallRole/onCallContact/recallDue`)**、urgent 一个工作小时后升级、Linear 评论确认、notify(Slack+可选呼叫,永不抛错,写 log)、startEscalation、runEscalations、advisory lock。
- `src/server/plugins/escalation.ts`(新)— 生产定时器(仅 Container App,自有 advisory lock),约每分钟跑一次 runEscalations。
- `src/server/auto-tickets.ts` — 开单后按 severity 决定:urgent/critical 且有告警配置 → startEscalation;否则照旧 announce;severity 存 `auto_tickets.severity`。
- `src/server/slack.ts` — `slackMention()`。
- `db/migrations/013_alerts.sql` — `alert_config`(twilio_*、contacts、**rotation、rotation_start**)、`ticket_escalations`(含 **last_call_at**)、`auto_tickets.severity`。
- `scripts/admin.ts` — `alerts:set`(Twilio 走环境变量、contacts 走 JSON 文件、`--rotation`/`--rotation-start`)、`alerts:show`(脱敏)。
- `vite.config.ts` — 注册 escalation nitro 插件。

## AC results

- **1 分级判定** — interpret SEVERITY_RULE + `splitSeverity`(单测);severity 列已入库(迁移校验)。
- **2 critical 工作时间阶梯** — 集成冒烟:10:00→stage1、10:01→stage2;单测 `criticalStageDue`(0/15/30)。
- **2b critical 工作时间外轮值** — 集成冒烟:夜间 +10min 不重拨、+20min 重拨(`last_call_at` 03:00→03:20);单测 `onCallIndex`(每周一换班、绕回、起始前钳位)、`onCallRole`、`recallDue`。
- **3 urgent 时间线** — 集成冒烟:工作时间 +30min 不升级、+90min 升级、周末不升级;单测 `urgentEscalates`。
- **4 low** — 代码路径:`notifyFiled` 仅对 urgent/critical 建升级行,low 照旧只发一条 Slack;runEscalations 的 WHERE 只选 urgent/critical。
- **5 确认** — 单测 `confirmationFrom`(旧/机器人/他人回复不算);集成冒烟:确认后该行从待处理集合排除。
- **6 重启恢复** — 状态全在 DB(stage、last_call_at),runEscalations 每趟从 DB 续跑;幂等插入;发送失败写 log 不致重复开单。
- **7 一套升级/工单** — `UNIQUE(project_id,url)` + 冒烟幂等(同 url 仅 1 行)。
- **8 不影响既有** — 升级仅对已配置告警的项目生效(bf 以外、未配置均不触发);low 行为不变;机械防线绿。
- **9 通知内容** — 单测 `escalationMessage`:含环境/简短问题/工单链接/当前需谁响应,不含错误正文。
- **10 Twilio** — 2026-11-12 真实试拨:从 +18064500923 拨 owner 本人 +353830091396,owner 确认响铃(Twilio no-answer/无错误码,即设计的短响);参数与"只拨配置号码"见 `twilio.ts`。
- **11 机械防线** — typecheck / 92 单测 / check:infui / build 全绿。

## Deviations

- plan.md 原定 critical 夜间走固定三人阶梯;2026-11-12 owner 追加"工作时间外按周值班轮值、只重拨值班人、不惊动另外两人",已改为此行为并补 `rotation`/`rotation_start`/`last_call_at`(见 plan.md 追加段)。
- 新增 critical 24 小时无确认自动停重拨的上限(防止无人确认时永久重拨),plan 未明列,属安全兜底。

## Environment

- 应用无新增运行时 env key。`alerts:set` 仅在配置时读取 `TWILIO_ACCOUNT_SID/API_KEY_SID/API_SECRET/FROM`(运维环境变量,不进应用运行时、不进 Git)。Twilio 凭据与号码只存 `alert_config`。
- Web 端口 63056(本次无 UI 验证,未启用)。

## Residual

- 部署后给 bf 执行 `alerts:set`(运维步骤,owner 已授权完全上线)。
- 需观察模型对**真实 bf 工单**的 severity 判断质量,确认 critical 确实罕见且判得对(owner 知情选择先全上)。
- Slack 实发与 Linear 评论确认未做"实时外部"集成演练(均为单测覆盖 + 既有 postToSlack 代码);真实呼叫已单独验证。

## Check

本单为后端告警,无可视 UI 变更。唯一需人判断的是上线后观察:真实 bf 工单的 severity 是否判得保守、critical 是否只在服务不可用时出现(关系到是否会半夜误拨)。

## Decided for you

- 工作时间外 critical 只重拨本周值班人、每 15 分钟一次,不惊动另外两人(owner 定)。
- 轮值顺序 final→primary→backup(Chonghuan→Qingyang→Yafei)、每周一 09:00 换班、2026-11-16 起;以角色序存 `alert_config.rotation`。
- critical 满 24 小时无确认停止自动重拨(安全兜底)。
- 主叫用美国号 +18064500923(owner 与同事定;Twilio 现要求买任何号都要合规档案,爱尔兰号更重)。
