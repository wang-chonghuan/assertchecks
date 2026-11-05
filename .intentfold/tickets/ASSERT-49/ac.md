# ASSERT-49 验收检查

本地端口 63049，有头浏览器 1440×900 和 390×844，登录 `sandbox+clerk_test@example.com`，项目 `sandbox`（报错来源是 BF 工作区，只读）。Slack 只用 `.credentials.local` 里的 `sandbox/slack-webhook`。

1. **配置。** `/p/sandbox?tab=errors` 的 Automatic tickets 卡片：填 Plane slug 和 token 后校验通过，项目和负责人下拉出现真实选项；错误 token 时报错不保存；Slack webhook 保存时测试频道收到测试消息，错误地址不保存；刷新后页面不显示密钥；移除后回到未配置。库里只读查 `error_automation` 与页面一致。
2. **自动开单。** 本地运行 `pnpm admin errors:auto sandbox`（与生产定时器同一函数）。sandbox 每个 needs a ticket 的报错问题都在 Plane “AssertChecks Sandbox” 里得到一张工单，指派给所选负责人，正文有错误信息、自动解读和问题链接；页面上这些问题移到 In progress。
3. **Slack。** 第 2 步每张工单在测试频道各有一条消息，含工单链接和问题摘要；网页手动挂单同样发送；移除 webhook 后不发，开单照常。
4. **不重复、不越界。** 再跑一次 `errors:auto sandbox` 不开新单；已有工单、Not handling、慢请求问题都没有工单。
5. **失败可见。** 把 token 换成失效值后（另一个已认领前的问题），页面显示该问题自动开单失败和原因，问题仍在 Needs a ticket。
6. **Linear。** 切到 Linear，在 owner 指定的地方真实开出一张工单。
7. **生产定时器。** 本地 dev 和本地生产构建都不启动定时器（日志可见）；部署后从 Container App 日志确认定时器启动并取得锁。

机械防线：`pnpm typecheck && pnpm test && pnpm check:infui && pnpm build`。
