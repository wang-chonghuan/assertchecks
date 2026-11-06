# ASSERT-52 计划

## 代码里看到、工单没写的

- 环境卡片是 `src/components/check-summary.tsx` 的 `CheckSummary`，项目页、检查页和首页示例共用，注释写明"三处永远一样"。卡片数据 `CheckCard` 由 `queries.ts` 的 `card()` 生成，已经带 `notPassed`：最近一次完整运行里没通过的用例（失败和未完整执行都算）。
- 检查页 Not passed 列表里每个用例的 Needs a ticket 来自 `caseBugs(projectId)`，判断是 `tickets.ts` 的 `caseStatus`：用例在项目任一检查项里现在失败且没有工单，或者工单修好后又失败。判断跨检查项，同一个用例可能在 DEV 和 PROD 两张卡片上都计入，这和两个检查页各自的列表一致。
- 项目页现在只调 `overview()`，不取工单，也不读运行历史；检查页的 `checkDetail()` 已经并行取了 `caseBugs`。
- 检查页可以用 `?run=N` 看历史运行，卡片显示那次运行；工单状态却是现在的，两者时间不一致。
- 首页示例卡片是写死的 `EXAMPLE`（31 failed of 260 cases tested）。

## 路线

1. `tickets.ts` 加纯函数：给定没通过的用例和项目的工单状态，数出需要开单的个数。单测覆盖：部分已挂单、全部已挂单为 0、修好后又失败计入、没有没通过的用例为 0。
2. `CheckCard` 加 `needsTicket: number | null`，null 表示不显示（全部通过、看历史运行）。`card()` 先填 null；`overview()` 与各卡片并行取一次 `caseBugs(project)` 再填数；`checkDetail()` 只在看最近一次运行时用已有的 `bugs` 填数。
3. `CheckSummary`：有没通过的用例且 `needsTicket` 不为 null 时，在标题行右侧放一个 Tag，"7 need a ticket"、"1 needs a ticket"、"0 need a ticket"；大于 0 用 error 色，等于 0 用默认色。与原有的 Timed out/Incomplete 标签并排，窄屏自动换行。
4. 首页 `EXAMPLE` 给一个需要开单数，让示例展示这个功能。
5. README 里检查卡片的说明补一句。

## 红线查对

- ui.md 1（改 `src/infui/` 的值）：不改，只用已有 text 样式、space 和 Tag 预设色。
- ui.md 2、3：不加库，不用 `.ant-*` 选择器或 `!important`。
- engineering.md 6：新增读取都在 `overview()` 里，项目来自按成员关系查到的 `project()`，不越界。
- engineering.md 3、4、5：不动依赖、不加迁移、不手改生成文件。
- operations.md 2：验收只写 sandbox；NSDK 的运行只读取，用官方推送接口原样重放到 sandbox/dev。
