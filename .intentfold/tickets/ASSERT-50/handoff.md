# ASSERT-50 交接

## 改动

- **项目声明的失败事件**（`src/server/failure-events.ts`、`telemetry.ts`、`production-errors.ts`）：项目可以声明“某个自定义事件的某个属性等于某值时算一次失败”。声明的事件和异常一起进入 failures 查询，按 operation 去重、归成问题，不受噪声规则影响，随后照常进入 Needs a ticket、自动开单和 Slack。名称、属性和值只允许 `[\w.-]`，存库和拼查询前都校验。
- **运维 CLI**：`pnpm admin source:events <project> [<event>:<property>=<value> ...]` 设置或清空；`list` 显示。bf 已声明 `bf_auth_recovery:outcome=failed`。
- **每小时上限**（`auto-tickets.ts`、`ticket-text.ts`）：每个项目任意 60 分钟最多 10 张普通自动工单；剩余问题合开第 11 张溢出工单（列出每个问题和链接，Slack 一条，最多列 10 个），这一小时内的新问题挂到它上面，不开单、不发 Slack。`errors:auto --per-hour <n>` 只用于在测试项目上试溢出。
- **浏览器扩展噪声**：堆栈只在 `chrome-` / `moz-` / `safari-web-extension://` 里的浏览器报错归为噪声（“Errors inside browser extensions”）。
- **数据库**：`011_failure_events.sql`（`error_sources.failure_events`）、`012_auto_ticket_overflow.sql`（`auto_tickets.overflow`、`filed_at`），均为加法，已执行。
- **文档**：README、engineering.md、operations.md。

## 验收结果

1. **声明——通过。** 格式错误被拒并说明原因；不带参数清空；`bf_auth_recovery:outcome=failed` 设置后 `list` 显示。
2. **次数一致——通过。** bf 出现问题 `bf_auth_recovery outcome=failed`：7 天 24、90 天 73、首次 2026-10-12 12:54；Log Analytics 直接按 operation 去重统计为 24、73、同一时间。
3. **开单与 Slack——部署后由线上定时器验证。** owner 同意不在本地手动开（本地运行被安全策略拦下）。部署前确认它排在 bf 待开单队列第一位，属报错类、在 Needs a ticket。
4. **未声明项目不变——通过。** 改动前后快照：nsdk 问题与次数完全相同；sandbox、bf 只多出声明的问题，以及随后扩展噪声规则移走的两个扩展报错（`M_ID`、MetaMask），实时数据中的噪声计数自然增长。
5. **限流——通过（sandbox，Plane ACSANDBOX，无 Slack，上限临时设为 3）。** 7 个待开单问题：3 张普通单（ACSANDBOX-17 至 19）+ 1 张溢出单 ACSANDBOX-20 挂上其余 4 个；同一小时内的新问题挂到 ACSANDBOX-20，没有新单；把记录时间往前拨 61 分钟后，新问题单独开出 ACSANDBOX-21。测试单已全部 Cancelled，sandbox 自动开单已关。

机械防线通过：typecheck、79 个测试、check:infui、build；antd lint 通过。

## 偏差

- 声明用运维 CLI，不做页面（owner：“或者你就直接把bf的纳入进过滤规则就行了”）。
- 本单追加了 owner 要求的每小时上限，以及 owner 选择的扩展噪声规则（选项 2）。

## 环境

- 端口：63050，未启动服务（验收通过脚本读同一套服务端代码）。
- 环境变量：无变化。
- 共享数据库：迁移 011、012；bf 的 `failure_events`；bf 的 `runtime.sendMessage` 问题由 owner 决定标为 Not handling；sandbox 的自动开单设置已清空。

## 遗留

- 部署后第一轮会为 bf 开 6 张单（匿名会话恢复失败、ServiceResponseError、TimeoutError、RangeError、TelemetryQueryError、Error: Na），指派 Qingyang Wang，#bf-errors 6 条。
- 没有堆栈的扩展报错（如 `runtime.sendMessage`）规则认不出，仍需手动标 Not handling。

## 检查

1. 部署后看 #bf-errors 和 Linear benefits-finder 里新开的 6 张单，尤其“匿名会话恢复失败”那张的写法。

## 替你决定的

- 声明的形状是“事件名 + 一个属性等于某值”。
- 声明的事件不受任何噪声规则影响。
- 溢出工单不写自动解读，只列问题并提示先查最近的部署；Slack 最多列 10 个问题。
- 扩展噪声只认“堆栈全部在扩展里”的报错；堆栈里也有网站页面的，算网站自己的代码。
