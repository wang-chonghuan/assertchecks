# ASSERT-49 计划

2026-11-05 owner 改为全部由服务器完成后重写。之前的 agent / `oas-error` / Mac 轮询路线作废，见 grill.md。

## 代码里看到、工单没写的

- AssertChecks 现在只在有人打开 Production errors 选项卡时才读遥测（`productionErrors()`，5 分钟缓存），后台没有任何定时任务。侦测要新加一个进程内的定时器。
- 本地开发和生产连同一个数据库。定时器只能在 Azure Container App 里运行（`NODE_ENV=production` 且有平台自动注入的 `CONTAINER_APP_NAME`），否则开发机会往真实平台开单；再用 Postgres advisory lock 保证同一时刻只有一个进程开单。本地验收用 `pnpm admin errors:auto <project>` 跑同一个函数一次。
- “Needs a ticket”现在只在前端算（triage 组里 7 天内出现过或新问题）。挪到 `problems.ts`，页面和自动开单共用。
- 挂单已经有 `attachTicket`（网页）和 `ticket_links` 表，自动开单写同一张表，页面自然显示在 In progress。
- 页面只有 `?tab=errors`，没有单个问题的地址。工单和 Slack 要链到问题，所以加 `?tab=errors&problem=<id>`。
- Plane 没有列出工作区的接口，接入 Plane 要填工作区 slug 和 token；Linear 一个 API key 就够，issue 必须属于某个 team，project 可选。
- `@azure/identity` 已在依赖里，拿 Azure OpenAI 的令牌不需要新库；Slack、Plane、Linear 都用 `fetch`。

## 路线

1. **迁移 `009_error_automation.sql`（加法）**
   - `error_automation`：每个项目一行，`platform`（plane / linear）、`token`、`workspace`（Plane slug）、`target_id` / `target_name`（Plane 项目或 Linear team/project）、`team_id`（Linear）、`assignee_id` / `assignee_name`、`slack_webhook`、`updated_by` / `updated_at`。
   - `auto_tickets`：每个问题一行（主键 `problem_id`），`state`（creating / created / failed）、`url`、`error`、`config_at`（认领时配置的 `updated_at`；配置改了才重试失败的）、时间。
2. **服务端模块**
   - `ticket-platforms.ts`：Plane 和 Linear 的校验身份、列项目、列成员、开单，全用 `fetch`。
   - `slack.ts`：向 webhook POST；只接受 `https://hooks.slack.com/`。
   - `interpret.ts`：Azure OpenAI 解读，`DefaultAzureCredential`（生产是托管身份，本地是 `az login`）。
   - `auto-tickets.ts`：取 needs a ticket 的报错 → 认领 → 解读 → 开单 → 写 `ticket_links` → 发 Slack；失败写原因。工单正文和 Slack 消息由纯函数生成（单测）。
   - `production-errors.ts`：读写自动开单配置（成员范围），`ProductionErrors` 带上配置摘要（不含密钥）和每个问题的自动开单状态。
   - Nitro 插件：只在 Container App 里每 10 分钟对已配置的项目跑一次，advisory lock 防并发。
   - 网页手动挂单也发 Slack。
3. **页面**：Production errors 顶部加 “Automatic tickets” 卡片：平台、接入密钥、项目和负责人下拉、Slack webhook，可保存和移除；问题行显示自动开单失败的原因；`?problem=<id>` 展开该问题。
4. **运维 CLI**：`errors:auto <project>` 手动跑一次（本地验收和排障）。
5. **文档与 Charter**：README；product.md 非目标与红线 1；engineering.md 结构、网页写入约定；operations.md 红线 9、托管身份角色、部署说明。

## 红线查对（2026-11-05 owner 明确要求，本单修改对应条目）

- product 红线 1（不存项目密钥）、非目标（不通知、不连工单系统）：按 owner 原话修改。
- operations 红线 9（只给 Log Analytics Reader）：改为也允许在 `finley-codex` 上授予 Cognitive Services OpenAI User。授予动作在部署时做。
- operations 红线 2：验收不写 nsdk、bf；Plane 写新建的 “AssertChecks Sandbox” 项目，Linear 测试单的去处届时问 owner。
- engineering 红线 3：不加依赖。红线 4：只加表。红线 6：配置读写都按成员关系。
- ui 红线 1：不改 `src/infui/`。
