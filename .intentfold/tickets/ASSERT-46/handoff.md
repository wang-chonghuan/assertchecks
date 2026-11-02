# ASSERT-46 交接

这项工作走的是开放开发。本文件记录交付内容和验证结果，不记录每处改动由哪个工具产生。

## 改动

- 技能 `finoge-app/narrative-skills`，分支 `ASSERT-46-red-one-line`：
  - `references/cap7.md` 重写为唯一的修红入口，`references/cap8.md` 删除。`assertchecks cap7 for DEV` 就是全部指令。每条红用例只有两个结果：在脚本或数据里修好，或者交给开发。一次处理一张工单，修复直接合并，工单在有用例交接时保持打开，最后只报两张列表。
  - `SKILL.md`、`agents/openai.yaml`、`references/cap0.md`、`references/cap3.md` 改为指向 cap7。
  - `assets/project/system-design.md` 新增 Red cases 一节，写明接手的开发。
- 本仓库：
  - `src/lib/bug-report.ts`：`bugs` 输出和“复制”报告开头的说明改成同一流程。旧说明要求按原因分别建单，会和新 cap7 矛盾。
  - `docs/index.html`：环回到 8 个节点，CAP7 叫 Clear red cases，一句话那页的要点换成新流程。

## 验收结果

1. 通过。全新的 Codex（只读沙箱）只拿到新技能、NSDK 在 #109 测试提交的代码、真实的 `bugs` 输出和 DEV 观察记录，指令只有 `assertchecks cap7 for DEV, plus E2E-164, E2E-156, E2E-111 and E2E-126 from the cap5 audit`。最后的消息只有两张列表，没有条件分析。判断和真实运行一致：E2E-004 修好；E2E-141、164、180、156、111、126 交给开发；E2E-116、214 留在已有工单上。
2. 通过。它只建一张工单，全部交接用例和证据都在上面，指派给 Nora。全程只问了一个问题，就是谁接手，并写进 system-design.md。
3. 通过。它不改产品代码，不用数据库当判断依据，不造交易，没有提出改用例描述。
4. 通过。本仓库现行文件和技能里 `git grep cap8` 都查不到。技能测试 31 个通过。
5. 通过。实际调用 `latestBugReport`，说明是新流程，旧说法已不存在。机械防线通过：typecheck、63 个测试、check:infui、build。
6. 通过。本地实际渲染第 11、14 页：环上 8 个节点互不重叠，文字没有错位。

## 偏差

和工单的建议方案一致。试跑的 Codex 遇到 needs_review 时选择点 Continue without changes，真实运行（ENG-1766）是排除 needs_review。两种都满足 Given，技能不强制哪一种。

## 环境

端口 63046 只用于本地预览幻灯片，已停止。没有增删改环境变量，没有迁移。

## 遗留

- 新 cap7 只做过试跑，还没有用这一句话真实跑过。同样的两种结果、一张工单的流程已经在 ENG-1766 上真实跑通，但当时靠的是一段长指令。
- NSDK 的 system-design.md 还没有 Red cases。下次 cap7 会问一次，之后不再问。
- `bugs` 的新说明要部署后才生效。

## 检查

1. 下次对 Codex 只说 `assertchecks cap7 for DEV`，看它是否只回两张列表。

## 替你决定的

- 合并到 cap7，删除 cap8。幻灯片和产品文案已经写着 `assertchecks cap7 for DEV`，留这个编号改动最少。
- “一张工单”指每次 cap7 一张。之后出现新的红用例，下一次 cap7 可以再开一张；已有打开工单的用例不会重复开单。
- 修复不等人直接合并，因为你说过现在都是自动合并。
- 接手的开发写在项目的 system-design.md，技能本身不绑定任何人。
