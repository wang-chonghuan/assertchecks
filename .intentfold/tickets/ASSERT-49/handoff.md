# ASSERT-49 交接

## 改动

- **服务器自动开单**（`src/server/auto-tickets.ts`）：对配置了去向的项目，把 Needs a ticket 里的每个报错问题先在 `auto_tickets` 认领，再用 Azure OpenAI 写解读，开到所选平台和项目，挂回 AssertChecks，然后发 Slack。解读失败不开单，下一轮重试；平台失败记下原因，设置改动后再试；每轮先验证一次密钥。慢请求问题不开单。
- **定时器**（`src/server/plugins/auto-tickets.ts`，`vite.config.ts` 注册）：只在 Azure Container App 里每 10 分钟运行一次，Postgres advisory lock 保证同一时间只有一个运行；本地 dev 和本地生产构建都不启动。`pnpm admin errors:auto <project>` 手动跑同一段代码。
- **平台**（`ticket-platforms.ts`）：Plane（工作区 slug + API token）和 Linear（API key）的校验、列项目、列成员、开单，全部用 `fetch`，没有新依赖。Linear 项目属于多个 team 时按 team 分别列出。
- **解读**（`interpret.ts`）：`finley-codex` 上的 `gpt-5.6-luna`，reasoning effort high，用 AssertChecks 自己的 Azure 身份调用，不存密钥；只看遥测，不看代码。
- **工单与 Slack 文字**（`ticket-text.ts`）：Linear 英文 Markdown，Plane 中文 HTML；标题一行、类型不重复；Slack 消息带工单链接和回到问题的链接。
- **Slack**（`slack.ts`）：incoming webhook，保存前发测试消息；网页手动挂单也发。
- **页面**（`automatic-tickets.tsx`、`production-errors.tsx`、项目路由）：Production errors 上的 Automatic tickets 卡片（平台、密钥、项目和负责人下拉可搜索、Slack 频道名和 webhook）；问题行显示自动开单失败及原因；`?tab=errors&problem=<id>` 打开并展开该问题；“需要工单”的口径挪到服务端共用。
- **数据库**：`009_error_automation.sql`（`error_automation`、`auto_tickets` 两张表）、`010_slack_channel_name.sql`（频道名一列），均为加法。
- **Charter**：按 owner 的要求修改 product（非目标、红线 1）、engineering（结构、网页写入、关键决定）、operations（角色、操作命令、红线 9、新增红线 10）、ui（组件清单）。README 加一节。

## 验收结果

1. **配置——通过。** 页面上：错误的 Slack webhook 被拒并显示 Slack 的原因（`HTTP 404 no_team`），正确的保存成功、频道收到测试消息；错误的 Plane token 显示 “the access key was refused”；已保存密钥时对话框打开即加载，项目和负责人下拉可输入搜索（输入 “yong” 找到 Yong Wang），保存后卡片显示去向；页面和接口都不返回密钥。
2. **自动开单——通过。** `errors:auto nsdk` 在 Linear narrative-sdk（ENG）开出 ENG-1797 到 ENG-1802，指派给 owner，正文有错误信息、自动解读、堆栈和问题链接；`errors:auto sandbox` 在 Plane ACSANDBOX 开出 9 到 16 号，中文、指派给 Yong Wang。两个项目的问题随后都移到 In progress（nsdk 读视图：Needs a ticket 0、In progress 6；sandbox 页面截图）。
3. **Slack——通过。** 14 张自动工单发送时都没有记录错误；网页手动挂 ACSANDBOX-4 后没有出现发送失败提示。频道里的实际消息我看不到，见检查第 2 条。
4. **不重复、不越界——通过。** 两个项目再跑一次都是 0 filed；4 个慢请求问题留在 Needs a ticket，没有工单。
5. **失败可见——通过。** sandbox 的 token 改成无效值后跑一次：8 个问题都显示 “Automatic ticket failed” 和 Plane 的原因，仍在 Needs a ticket；设置不变时再跑不重试；在页面重新保存后重试成功。
6. **Plane 和 Linear 各开出真实工单——通过**（见第 2 条）。
7. **定时器——本地部分通过。** dev 日志：`automatic tickets: off here; they run only in the Azure Container App`。线上启动要部署后看日志。

机械防线通过：typecheck、73 个测试、check:infui、build；antd lint 通过。浏览器验收用 CloakBrowser 无头模式（sandbox 测试账号需要独立会话），1440×900 和 390×844。

## 偏差

- 路线从最初的 agent / `oas-error` 技能 / Mac 轮询，按 owner 的要求改为全部在服务器上完成，没有新建技能，也没有改客户端。
- 验收按 owner 的指示真实开到了 nsdk 的 Linear（narrative-sdk，ENG），不是只写 sandbox。
- 解读失败原本照样开单；验收中出现 8 张没有解读的 Plane 单（ACSANDBOX-1 到 8，Azure 授权尚未完全生效），改为不开单、下一轮重试。

## 环境

- 端口：web 63049（预览仍在运行）。
- 环境变量：没有增删改。
- 共享数据库：已执行迁移 009、010（加法）。nsdk 和 sandbox 已保存自动开单设置，用的是 owner 自己的 Linear key 和 Plane token；Slack 都指向测试频道。
- Azure：owner 账号和 Container App 托管身份在 `finley-codex` 上获授 Cognitive Services OpenAI User。
- Plane：新建项目 AssertChecks Sandbox（ACSANDBOX）。

## 遗留

- **部署后线上会立刻开始开单。** nsdk 已经配置好，部署后定时器会把 nsdk 新出现的报错开到 narrative-sdk（ENG）、指派给 owner、发到测试频道；sandbox 会把 BF 报错开到 ACSANDBOX。部署前如要换负责人或正式频道，在页面上改。
- 密钥明文存在数据库，只有服务器使用，不回显；能直接读库的人能拿到。
- Linear 列表最多列 100 个进行中的项目、每个项目 10 个 team。
- 解读只看遥测，不看代码；以后如需读代码的分析，由项目自己的 CI 往工单补充（已和 owner 讨论，不在本单）。
- ACSANDBOX-1 到 8 是没有解读的早期测试单，留在测试项目里。

## 检查

1. Linear ENG-1797 到 ENG-1802：解读的写法和长度是否合你的意；负责人和频道部署前要不要换。
2. 你的 Slack 测试频道：消息格式是否合适。现有两个项目的 Slack 是在加“频道名”之前保存的，卡片上显示为 `hooks.slack.com/…MtbT`；在页面 Slack › Change 里填上频道名再保存一次就会显示名字。
3. http://127.0.0.1:63049/p/nsdk?tab=errors （用你自己的邮箱登录）：Automatic tickets 卡片和 In progress 里的 6 个问题。

## 替你决定的

- 本次 nsdk 的单指派给你本人（你没指定负责人）。
- 解读失败就不开单，下一轮自动重试；平台失败要改设置后才重试。
- Plane 工单用中文，Linear 用英文。
- 网页手动挂到报错上的工单也发 Slack；一次挂单发一条。
- 定时器只在 Container App 里运行，每 10 分钟一次。
- Slack 频道名由人填写，因为 webhook 本身不带频道名。
- 项目的任何成员都能改自动开单设置。
