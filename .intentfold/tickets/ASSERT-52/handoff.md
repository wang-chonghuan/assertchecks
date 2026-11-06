# ASSERT-52 交接

## 改动

- **环境卡片上的需要开单数**（`src/components/check-summary.tsx`）：最近一次完整运行有没通过的用例时，标题数字正下方单独一行显示 "9 need a ticket" / "1 needs a ticket" / "0 need a ticket"；大于 0 为红色，等于 0 为绿色。全部通过时不显示。项目页、检查页和首页示例是同一个组件，三处一致；检查页打开历史运行（`?run=N`）时不显示。
- **计数口径**（`src/server/tickets.ts` 的 `needsTicketCount`）：没通过的用例里，按检查页同一套判断为 Needs a ticket 的个数。已挂单、仍在处理的不计；工单判定修好后又失败的计入（ASSERT-39 的规则），所以它和检查页 Not passed 列表里 Needs a ticket 的个数永远相同。
- **读取**（`src/server/queries.ts`）：`CheckCard` 加 `needsTicket`。项目页先出各卡片，再只对没通过的用例判断工单状态；`recentRuns` / `caseBugs` 带用例 ID 时，运行结果只取这些用例，这也让已经按 ID 调用的案例页和 "Copy bugs" 报告读得更少。检查页沿用它已有的整项目判断。
- **单测**（`tests/tickets.test.ts`）：部分挂单、修好后又失败、全部挂单为 0、没有没通过的用例为 0。
- **文档**：README 中检查卡片的说明补了一句。

## 验收结果

本地 63052 端口，`sandbox+clerk_test@example.com` 登录，Playwright 无头 Chromium（独立会话，不碰你的浏览器）。数据只写 sandbox：把 NSDK DEV 的两次真实运行原样经推送接口重放到 sandbox/dev（NSDK 运行 91 为 sandbox #116，全部通过；NSDK 运行 115，即 11-06 的定时运行，为 sandbox #117）。

1. **部分挂单时显示需要开单数且等于检查页：通过。** 重放 #117 后 DEV 卡片显示 "10 need a ticket"，检查页 Not passed (11) 里 Needs a ticket 10 个、In progress 1 个（E2E-180 在 sandbox 里有单）。最终代码上（见第 2 条之后的状态）卡片 9、列表 Needs a ticket 9、In progress 2。
2. **挂单后数量减一：通过。** 在 DEV 检查页给 E2E-074 通过界面挂上 sandbox Plane 的真实工单 ACSANDBOX-22，该行变为 In progress，项目页刷新后卡片从 "10 need a ticket" 变为 "9 need a ticket"。之后改为只判断没通过用例的读取，同一数据上仍为 9，与检查页一致。
3. **全部已挂单时显示 0：通过。** PROD 最近一次完整运行 12 个没通过，全部有单：卡片 "0 need a ticket"（绿色），检查页 Needs a ticket 0、In progress 12。
4. **全部通过时不显示：通过。** 重放 #116 后 DEV 卡片为 "160 cases passed"，没有需要开单的标签（`ac4-project-1440.png`）。
5. **两种视口下可读：通过。** 1440×900 和 390×844 下项目页、检查页、首页截图中计数完整，不压住标题数字；项目页和检查页在 390 下 `scrollWidth` = 390。首页在 390 下为 398，来源是 hero 区 Row 的 gutter，去掉新标签后仍是 398，早于本单。

机械检查：`pnpm typecheck`、`pnpm test`（80 通过）、`pnpm check:infui`、`pnpm build` 全部通过；antd lint 无问题。

性能：本地对 nsdk 的项目页读取（远程库），基线热读取 0.77–0.98 s，本单 0.86–1.04 s，约多一次往返。

## 偏差

- 计划第 2 步原定"与各卡片并行取整项目的工单状态"，实测热读取变成 1.0–1.4 s，改为先出卡片、再只判断没通过的用例。
- 计划第 3 步原定标签放在标题行右侧、0 用默认色。交付前的用户视角检查指出：宽卡片上标签离数字很远，三处位置不一；0 的颜色与 ASSERT-42 的返工要求"0/160 failed 绿色badge"不一致。已改为标题下方单独一行，0 用绿色。

## 环境

- 端口：web 63052（dev server 留着供你查看）。
- 环境变量：无增删改。
- 数据库：无迁移。sandbox/dev 新增运行 #116、#117，E2E-074 挂了 ACSANDBOX-22（AssertChecks Sandbox 项目中新建的验收单），都留在 sandbox 供查看。

## 遗留

- 首页在 390 宽下有 8 px 横向溢出（hero 区 Row 的 gutter），早于本单，值得另开一单。
- 上线后 NSDK DEV 卡片会显示 9，不是盘点时说的 7：E2E-186、E2E-189 有单，但单子已判定修好后又失败，按规则要开新单。

## 请你看

1. 项目页两张卡片：DEV 红色 "9 need a ticket"、PROD 绿色 "0 need a ticket"，位置和颜色。
2. 检查页顶部同一张卡片，与下方列表里的 Needs a ticket 个数对照。
3. 公开首页的示例卡片多了 "3 need a ticket"，是否愿意在首页展示。

## 替你决定的

- 口径与检查页的 Needs a ticket 完全相同，修好后又失败的用例也计入。
- 三处共用的卡片都显示，首页示例写 3。
- 检查页看历史运行时不显示，因为工单状态是当前的。
- 标题数字正下方单独一行；大于 0 红色，0 绿色（依 ASSERT-42 的返工要求）。
- 全部通过时不显示 0，"写0"只用于失败用例都已挂单的情况。
- 项目页只判断没通过的用例，代价约一次数据库往返。
- 验收数据用 NSDK 真实运行原样重放到 sandbox，不自造报告。
