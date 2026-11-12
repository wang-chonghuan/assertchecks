# ASSERT-56 plan — BF 告警通知与无人响应升级

## 现状（读码所得）

- 自动开单在 `src/server/auto-tickets.ts`：每个 needs-a-ticket 的 error 问题 → claim → `interpret()` 写解读 → `createTicket()` 开单 → `attach()` → `announce()` 发一条 Slack。`plugins/auto-tickets.ts` 每 10 分钟在生产跑一次。
- `interpret()`（interpret.ts）只返回一段解读文本，不打严重度。
- `createTicket()`（ticket-platforms.ts）Linear 分支只返回 `url`，不返回 issue id/identifier。
- Slack 走 `postToSlack(webhook, text)`（slack.ts）；bf 的 webhook 存在 `error_automation.slack_webhook`（#bf-errors）。
- `auto_tickets` 表按 problem_id 记录；无严重度、无升级状态。
- 无 Twilio、无升级任务、无读 Linear 评论的能力。ASSC 无任何严重度概念。

## 三档（owner 定稿）

- **low**：照常开单 + 发一条 Slack（沿用现有 announce），不打电话、不升级、不计时。
- **urgent（默认）**：开单 + Slack @Qingyang；爱尔兰工作时间 Mon–Fri 09:00–17:30 内累计满 1 小时无人确认 → 升级 Yafei（Slack @Yafei + Twilio 电话）。计时与电话只在工作时间。
- **critical（仅服务不可用，保守）**：
  - 工作时间内：立即 @Qingyang + 电话 → +15min @Yafei + 电话 → +30min @Chonghuan + 电话；目标 30 分钟内确认。
  - 工作时间外（owner 追加 2026-11-12）：不惊动三人，只 @ 并呼叫**本周值班人**，未确认约每 15 分钟对同一人重拨，直到回复或进入工作时间；满 24h 无确认停止。值班按**每周轮值**，顺序 Chonghuan→Qingyang→Yafei（= final→primary→backup），**每周一 09:00 换班**，从 2026-11-16 开始；存 `alert_config.rotation`(角色序) + `rotation_start`。换班时刻按整周 ms 计算，爱尔兰夏令时切换时该时刻可能前后差 1 小时，对值班无影响。
- 严重度由解读模型在开单时一次判定（不在后台任务里重复分类）。
- 实现：`escalation.ts` 增 `onCallIndex/onCallRole/onCallContact/recallDue`；`startEscalation` 加 `now` 参数并在非工作时间 critical 首呼值班人、记 `last_call_at`；`runEscalations` 非工作时间 critical 走重拨分支（不动 stage），工作时间仍走 0/15/30 阶梯；选取条件改为 critical 只要未确认且建单 24h 内即保持开启。迁移 013 加 `alert_config.rotation/rotation_start`、`ticket_escalations.last_call_at`。CLI `alerts:set` 加 `--rotation`/`--rotation-start`。

## 路线

1. **严重度判定**：扩展 `interpret()` 返回 `{ reading, severity }`。系统提示新增：首行输出 `SEVERITY: critical|urgent|low`，严格标准——critical 仅当遥测显示“服务对用户不可用/宕机”（核心流程普遍失败、无法登录/加载、核心接口大面积报错）；拿不准判 urgent；明显轻微判 low。解析首行后从解读正文剥离。
2. **Linear issue id**：`createTicket()` 返回 `{ url, id }`（Linear 取 issueCreate 的 `issue.id`；Plane 返回 id=null）。auto-tickets 相应取 `url`。
3. **读 Linear 评论**：ticket-platforms 新增 `issueComments(access, issueId)` → `{authorEmail, createdAt}[]`，GraphQL `issue(id){comments{nodes{createdAt user{email}}}}`。
4. **配置与密钥（存库）**：新表 `alert_config`（project_id PK）存 Twilio（account_sid、api_key_sid、api_secret、from_number）与联系人 jsonb（`[{role:'primary'|'backup'|'final', name, slack_id, phone, email}]`）。只 bf 配置。密钥只存库、不回显、不进 Git/日志。用运维命令 `alerts:set` 写入（值从环境变量读，避免进 shell 历史）。升级频道沿用 `error_automation.slack_webhook`（#bf-errors）。
5. **升级状态**：新表 `ticket_escalations`（project_id, url, 唯一）——severity、issue_id、created_at、stage（已发到第几级）、各级 at、confirmed_at、confirmed_by、last_checked_at、log jsonb（每级 slack ok / call sid / 失败）。只有 urgent/critical 在开单时建行；low 不建（行为等同现状）。overflow 工单只建一行（一套升级），默认按 urgent 处理。
6. **开单接线**（auto-tickets.ts）：拿到 severity 后——low：维持现状；urgent/critical：建 escalation 行并立刻发“第 0 级”通知（Slack @primary via `<@slack_id>` + critical 还拨 primary 电话）。通知内容含环境、简短问题、工单链接、当前需谁响应，不含用户敏感信息。
7. **Slack @mention**：slack.ts 增加按 member id 生成 `<@U...>`；通知文案在 ticket-text.ts 里新增 `escalationText(...)`。
8. **Twilio**（新 `src/server/twilio.ts`，按官方文档实现）：REST `POST /2010-04-01/Accounts/{AccountSid}/Calls.json`，Basic auth = API Key SID:secret，`To`=联系人号、`From`=配置号、`Timeout`≈12s、内联 `Twiml=<Response><Hangup/></Response>`（接通即挂），不启用 AMD。只拨配置里的号码，不接受外部输入。返回 call sid；发起失败记录、不盲目重拨。
9. **后台任务**（新 `src/server/plugins/escalation.ts`，仿 auto-tickets 插件，仅生产 Container App，每 ~60s，一个 advisory lock）：对未确认的 escalation 行——先读 Linear 评论判确认（作者 email ∈ 配置联系人且 createdAt > created_at → confirmed，停）；否则按 severity 到点发下一级（critical +15/+30；urgent 工作时间累计 1h），每级一次；不重复 LLM/采集/开单。重启后按已记录 stage 续，不重发。
10. **章程修订**（owner 请求即授权，记录）：product.md 红线 1 增加“Twilio 凭据与被叫号码”为允许存储的例外；product.md Contract 的“只发 Slack 工单、不发其它通知”扩展为“BF critical/urgent 的分级 Slack @ 与 Twilio 短响铃”。engineering.md 结构与关键决策补该流水线。operations.md Tools 增 `alerts:set`，并记真实试拨/部署需 owner 确认、只拨已配置号码。

## 不做 / 已知局限

- 不改采集/分类/去重/累计/开单规则；不碰 NSDK；不动 BF 自己直接发 Slack 的链路。
- 服务静默挂掉（无遥测）侦测不到，不在本单。
- Twilio 不播语音、不录音、不启用付费 AMD；不承诺绝不接通/绝不收费。
- 不新增 bot、不新增通知 UI。

## 红线检查（编码前）

- product.md 红线 1（禁存第三方凭据，ASSERT-49 例外）：本单新增 Twilio 凭据+号码存库 → 按 owner 请求扩展该例外，改 product.md 并记录。
- product.md Contract（“不发除工单 Slack 外的通知”）：本单新增分级通知 → 按 owner 请求扩展，改 product.md。
- product.md 红线 2（不写项目遥测/云资源）：未触犯（只读 Linear 评论、发 Slack/打电话，都不是项目遥测）。
- engineering.md：新增表走增量迁移；无新 UI 库。operations.md：真实试拨/部署需 owner 确认（已获授权拨 owner 本人号 +353830091396 做测试）。
