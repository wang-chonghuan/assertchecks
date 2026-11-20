# ASSERT-73 计划

## 代码里看到、工单没写的

- ASSERT-72 合并后，cap1「Requirement Changes」把「受影响的老用例」定义为在工单构建上跑 active regular 时变红的用例，并链接到 cap3「Before Merge」。
- cap3「Before Merge」要求交接前跑全部 active regular，还用「主分支最近一次定时运行已红」判断红用例归属。第一句里的 "this step is what selects that target" 意思含糊。
- cap7 开头说它处理合并后的红；它的负责人规则「按项目规则或人的指示」不用改。
- 技能自带 32 个测试只覆盖 `catalog-changes.mjs` 和技能元数据，不涉及这几段文字。

## 路线

只改 narrative-skills 仓库 `assertchecks/references/` 下的三个文件，本仓库只放工单记录。

1. cap1：用例只从验收标准增改，并在合并前重跑（指向 cap3）；不去找受影响的老用例，由合并后的定时运行发现，交给 cap7。
2. cap3「Before Merge」：交接前在工单构建上按 ID 只重跑本工单增改的用例，没有就不跑；红了按原来三条路在本 PR 解决；其余用例合并前不跑，合并后定时运行变红归 cap7。顺便把 "selects that target" 改成「在工单构建上运行，代替默认环境」。
3. cap7 开头：注明合并后的红包括已合并工单影响到的老用例。
4. 验收：让没有上下文的全新子 agent 只读改后的技能目录回答问题；再跑技能自带测试。
