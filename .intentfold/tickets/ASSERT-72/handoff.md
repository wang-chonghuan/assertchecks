# ASSERT-72 交接

## 改动

技能改在 narrative-skills 仓库分支 `ASSERT-72-ticket-case-upkeep`（`9a9f3e0`、`4dcebb5`），本仓库只有工单记录。

- `assertchecks/references/cap1.md`：Find 只做全产品基线和每次发布；工单只走 Requirement Changes。Requirement Changes 改为：用例在工单自己的 PR 里更新，不对整个用例集分类或搜索；新增或修改的用例只从验收标准来；受影响的老用例就是在工单构建上跑 active regular 用例时变红的。保留同一行为保留 ID、停用经用例负责人、冲突预期两边列出来问人。删掉「整个用例集四分类」「全量搜索共享行为」「无法探索的产品按设计起草」。
- `assertchecks/references/cap3.md`：红用例按运行来源分。新增「Before Merge」：交接前在工单构建（预览或项目指定的本地目标）上跑 active regular 用例，红的归本工单，在同一个 PR 里解决，不另开工单，三条路是按 cap7 Repair 第 1–4 步修脚本或数据、向用例负责人提出修改或停用、修产品；主分支最近一次定时运行里已经红的不算本工单的，仍归 cap7。合并后定时运行的红归 cap7，已移交的工单归 cap8。
- `assertchecks/references/cap7.md`：开头说明它处理合并后的红，工单合并前的运行在自己的 PR 里解决。
- SKILL.md、cap7 的负责人规则、AssertChecks 平台代码、IntentFold 技能都没动。

## 验收结果

验收由没有本会话上下文的子 agent 完成，它只读工作树里更新后的技能文件作答，问题里不带预期答案。

1. 通过。回答「只从工单验收标准新增或修改用例；受影响老用例 = 在工单构建上跑 active regular 时变红的」，并引用 cap1「Do not sort or search the whole catalog for it」。
2. 通过。回答在同一个 PR 内解决、不另开工单、不走 cap7，三条路齐全；需要改用例文字时向负责人提议并等负责人亲口批准。
3. 通过。回答合并后定时运行的红走 cap7，负责人「by the project's rules or the person's instruction」。
4. 通过。同一行为保留 ID；停用经 CODEOWNERS 指定的用例负责人；冲突预期两边列出来问人。
5. 通过。技能目录里 NSDK、ENG 编号、项目环境变量的命中数与基线 `e6ed01f` 相同（1 处，cap7 原有的链接示例），没有新增；`node --test assertchecks/tests/*.test.mjs` 32 个全部通过。

第一轮子 agent 指出三处，已修，修后又让另一个全新子 agent 重答 AC 1、2，并确认技能里不再有「单个工单为自己合并前的红另开工单」或「对整个用例集分类、搜索」的说法：
- cap3 指向的 cap7 Repair 包含「移交并单开工单」，和「不另开工单」冲突 → 改为只引用第 1–4 步；
- 「Do not read the whole catalog」和项目契约要读 `e2e.json` 冲突 → 改为「Do not sort or search」；
- cap7 那半句把范围说窄了，没包括人点名的用例 → 改为「handles red cases after merge」。

本仓库机械防线通过（typecheck、test、check:infui、build）。

## 偏离计划

无实质偏离。三处修订见上。

## 环境

没有启动服务，没有端口，没有增删改环境变量，没有迁移，不需要部署。

## 遗留

- narrative-skills 主检出 `~/.skillhost/user_repos/narrative-skills` 有别的会话未提交的 `n-azure/SKILL.md` 改动，`skillhost update` 因此拒绝更新，而且拒绝前会先摘掉 Claude 的技能链接（本次已用 `skillhost relink narrative-skills --agent claude` 恢复）。合并后要装上新版，需要先处理那份改动；它不是本单的，我没动。
- 子 agent 指出、本单没加规则的模糊点：合并前谁决定改产品还是改用例；验收标准没写到的、受影响的 on-demand 用例或仍然通过的过时用例怎么发现；向负责人提议还没批准时 PR 能否合并；怎样判断一条用例「在主分支最近一次定时运行里已红」（目前只有 cap7 的 `bugs --check`）。
- NSDK 侧（ENG-1946）把预览运行命令、「最近合并的工单」规则写进它自己的 Charter 和 system-design.md。

## 请你看

1. cap3 新增的「Before Merge」一节，尤其最后一句「主分支最近一次定时运行里已经红的不算本工单的」，这一句是我加的。
2. cap1「Requirement Changes」的新写法。

## 替你决定的

- 主分支定时运行里已经红的用例不归工单，仍归 cap7（依据 ENG-1946「先清掉现有红，交接时的红才能归到工单」）。
- cap1 的 Find 不再按工单跑，只做基线和发布前。
- 删掉「无法探索的产品按批准的设计起草」。
- cap1 不写怎么跑，指向 cap3；具体命令归项目 system-design.md。
- 验收用全新子 agent 读工作树技能文件，不等 `skillhost update`。
- 类型记为 fix，优先级 high（依此前 ASSERT-39/46/47 技能规则修正的先例）。
