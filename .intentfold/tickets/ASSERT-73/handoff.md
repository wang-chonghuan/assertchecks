# ASSERT-73 交接

## 改动

技能改在 narrative-skills 仓库分支 `ASSERT-73-rerun-changed-cases`，提交 `ad65358`、`6773135`，基线 `bd1a13a`，含 ASSERT-72。本仓库只有工单记录。

- `assertchecks/references/cap1.md`「Requirement Changes」：用例只从验收标准增改，合并前要重跑（指向 cap3）。不去找受影响的老用例，由合并后的定时运行发现，交给 cap7。保留 ID、停用经负责人、冲突两边列出来问人，这三条不变。
- `assertchecks/references/cap3.md`「Before Merge」：
  - 交接前在工单构建上按 ID 只重跑本工单增改的用例。工单构建指预览或项目指定的本地目标，代替默认环境；只改了脚本的用例也算改过。没有增改就不跑。
  - 重跑红了，仍按原来三条路在本 PR 内解决。
  - 其余用例合并前不跑，合并后在定时运行里变红的归 cap7。
  - 删掉了「跑全部 active regular」和「主分支最近定时运行已红的不算」。
- `assertchecks/references/cap7.md` 开头：合并后的红也包括已合并工单影响到的老用例。负责人规则不变。

## 验收结果

验收由没有本会话上下文的全新子 agent 完成。它只读 `narrative-skills--ASSERT-73/assertchecks/`，问题里不带预期答案。

1. 通过。它的回答是交接前只按 ID 重跑本工单增改的用例，没有就不跑，引用 cap3:79–81 和 cap1:43–44。
2. 通过。全文查找后，技能里没有要求交接前跑全部 active regular，也没有拿定时运行判断交接前红用例归属的说法。它列出的最接近的三处与此无关：cap3 的全量通过措辞、cap7 的 `bugs --check`、cap7 的共享数据修复。用 `grep` 查旧措辞也查不到。
3. 通过。它的回答是合并后的定时运行发现，cap7 修复或交给负责人，引用 cap1:45–46、cap3:89–90 和 cap7 开头。
4. 通过。`node --test assertchecks/tests/*.test.mjs` 32 个全部通过。

本仓库的机械防线（`pnpm typecheck && pnpm test && pnpm check:infui && pnpm build`）通过。

## 偏离计划

子 agent 指出「增改的用例」没说清只改脚本算不算，已补成「in the catalog or in their scripts」（`6773135`）。

## 环境

没有启动服务，没有端口，没有增删改环境变量，不需要部署。

## 遗留

- 子 agent 指出，cap8 对只改测试的修复要求在项目默认目标上证明，而 cap3 合并前用工单构建。两者场景不同：cap8 是合并后移交的单。本单没有改。
- 重跑要通过几次，由 SKILL.md「新增或修改的测试要连续两次零重试通过」决定，Before Merge 没有重复写。

## 请你看

1. cap3「Before Merge」新写法：只重跑本工单增改的用例，其余合并后归 cap7。
2. cap1「Requirement Changes」第二、三条。

## 替你决定的

- 重跑目标沿用 ASSERT-72 的「工单构建」，并写明它代替默认环境。
- cap7 负责人规则不改。「交给可能导致它的已合并工单」是 NSDK 的项目规则，写在 NSDK 的 Charter（ENG-1946）里。
- 只改脚本的用例也算改过。
