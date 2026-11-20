# ASSERT-72 计划

## 代码里看到、工单没写的

- 技能源码在 narrative-skills 仓库 `assertchecks/`，通过 PR 合到 `finoge-app/narrative-skills` main，`skillhost update` 安装。本仓库只放工单记录，`docs/index.html` 里 cap1、cap7 的说法（"cap1 suggests them"、"Clear red cases"）与新规则不冲突，不改。
- cap1 开头写着「Run it once over the whole product as a baseline, then for each ticket or release」，Find 第 1 步读「the ticket」。也就是说除了 Requirement Changes，Find 本身也按工单整套走一遍。这同样是按工单通读，要一起收掉。
- cap1 Requirement Changes 末尾「A product that cannot be explored yet is drafted from its approved design」：用例改从验收标准来以后，这句多余。
- cap3 已支持对本地目标和工单 URL 跑（「explicit local execution, resolve the project's local target and any ticket URL override」），不用新增运行方式；缺的只是红用例归谁。
- cap7 从 `bugs --check` 取的就是检查的最近一次完整运行，即合并后的定时运行；开头没说明它不管工单合并前的运行。
- 合并前运行里，有些红在主分支最近一次定时运行里已经红了，它们不是本工单造成的。ENG-1946 自己也写了「先清掉现有红，交接时的红才能归到工单」。技能要说清这类红仍归 cap7。

## 路线

1. `references/cap1.md`
   - 开头：Find 只做全产品基线和发布前；工单走 Requirement Changes。Find 第 1 步去掉「and the ticket」。
   - Requirement Changes 重写：新增或修改的用例只从工单验收标准起草，在同一个 PR 里；受影响的老用例 = 在工单构建上跑 active regular（cap3）的红，按 cap3 合并前规则处理；保留三条原规则；删掉「整个用例集四分类」「全量搜索共享行为」「无法探索的产品按设计起草」。
2. `references/cap3.md`
   - 把「repairing is cap7, or cap8 on a handed ticket」改为按运行来源分：合并前的工单运行见新的一小节，合并后定时运行的红归 cap7，已移交工单归 cap8。
   - 新增「Before Merge」小节：对工单构建跑 active regular；红的在本工单 PR 内解决，三条路（修脚本或数据按 cap7 Repair、向用例负责人提出修改或停用、修产品），不另开工单；主分支最近一次定时运行里已红的用例不算本工单的，归 cap7。
3. `references/cap7.md` 开头补半句：它处理的是合并后定时运行的红。
4. SKILL.md：路由表和描述的措辞与新规则不冲突，不改（描述长度受元数据测试约束）。

删除多于新增。不写 NSDK 的命令、账号、环境。

## 验证

见 `ac.md`。技能测试：`node --test assertchecks/tests/`。
