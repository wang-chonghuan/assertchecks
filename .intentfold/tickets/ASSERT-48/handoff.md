# ASSERT-48 交接

这项工作走的是开放开发。本文件记录交付内容和验证结果，不记录每处改动由哪个工具产生。

## 改动

- 技能：新增 `references/cap8.md`。开发说 `assertchecks cap8 <工单>`，agent 走项目的工单流程修这张单（IntentFold 项目用它的 cap3），改产品还是改测试由开发决定，用 cap3 按 ID 连跑两次证明。
- 技能：cap7 删掉“On a handed ticket”一节，规则移到 cap8，并要求工单写上开发要说的那句话。
- 技能：描述加引号并缩到 1013 个字符，修好 Codex 的加载失败，新增 `tests/skill-metadata.test.mjs` 防止复发。
- 本仓库：`docs/index.html` 的能力环和第 14 页加上 cap8。

## 验收结果

1. 通过。合并前，Codex 从 NSDK 项目目录加载了这版技能，读到 cap8；当时只有未修的全局副本报错。合并后的全局副本在工单评论里复查。
2. 通过，仅限只读试跑。全新 Codex 拿到 `assertchecks cap8 ENG-1767` 和工单文字，按 cap8、IntentFold cap3、cap3handoff 规划，把改产品还是改测试留给开发，用 cap3 按 ID 跑两次，写入开关也带上了，并说明不达标时工单保持打开。没有真正修过单。
3. 通过。搜索了 cap 的引用，渲染了第 11、14 页。

技能测试 32 个通过。机械防线通过（typecheck、test、check:infui、build）。

## 环境

没有启动服务，没有增删改环境变量，没有迁移。没有产品代码改动，不需要部署。

## 遗留

- cap8 还没有真实修过一张单。
- ENG-1767 到 ENG-1772 是 cap8 之前开的，工单上没有那句话。
- 试跑时 Codex 指出 NSDK 的 `operations.md` 要求 UI 证据用有头 Chrome，而 `system-design.md` 禁止 assertchecks 用有头模式，可能会问开发一次。
- `ips-data-loop` 技能有同样的 YAML 错误，属于另一个技能库，这里没动。

## 替你决定的

- cap8 的结果只保证到合并，AssertChecks 页面要等下一次定时运行测到修复才变绿，cap8 会明说。
- 工单类型记为 story。
