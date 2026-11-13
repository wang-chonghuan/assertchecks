# ASSERT-59 交付

## 改动

完成一次性 NSDK `prod-live` 展示数据操作，不修改产品代码。
当前用例集合中选定 91 个用例，保留原始分组、Given/When/Then；
每日 136 条 Then，2026-10-16 至 2026-11-13 共 29 个完整绿色 run。
数据为人工生成的展示历史，不是 NSDK 测试的真实执行记录。

本分支只提交 `ticket.json`、`operation.md` 和此交付记录。完整集合、
生成工具、精确 ID、数据指纹及截图均保留在本地 git-ignored 目录。

## 验收结果

- AC1 通过：使用用户现有、已核对身份的 Chrome 登录，在后台只读进入
  `https://assertchecks.com/p/nsdk`；新增 `prod-live` 卡片显示
  `91 cases passed`，可进入详情。原 DEV、Local、PROD 仍保留。
- AC2 通过：权威只读查询核对 29 个 run，日期逐日覆盖指定范围，每日唯一，
  全部 passed；线上历史共 6 页，末页显示 2026-10-16，可选中该次历史且显示
  Passed / 91 cases passed。每日开始时间为 05:03 至 05:05 UTC，
  耗时 208 至 244 秒，基于所选用例的实际近期耗时比例生成。
- AC3 通过：线上当前详情渲染 91 个用例链接、Passed (91)、Not passed (0)、
  Not in regular runs (0)。用例详情显示完整 Given/When/Then，当前及最早历史
  均为 Passed。逐个 run 的完整 catalog/report 经现有格式校验及 dry-run 判定器
  重算一致，91 个用例及 136 条 Then 全通过。
- AC4 通过：环境 period 为空，现有状态函数在未来时间仍返回 up，线上信息提示
  No schedule；CI URL 和部署版本未伪造，测试提交显示 not recorded。
- AC5 通过：在本工单测试项目中运行同一生成、精确删除流程，删除只涉及该环境
  与其 29 个 run；第二次执行为 no-op。删除前后原记录指纹不变。测试项目最后
  通过管理 CLI 移除。本工单真实 NSDK 环境未删除，供人审阅。
- AC6 通过：写入前后原 checks、runs、ticket_links、users、memberships 指纹
  一致；新增差集恰为本次一个环境及 29 个 run，没有 BF、其他环境、共享工单
  或用户写入。
- 机械检查通过：`pnpm typecheck && pnpm test && pnpm check:infui && pnpm build`
  成功。依赖已有的弃用和 use-client 构建提示未导致失败。
- 页面实测 CSS 视口 1440x900 和 390x844 均无页面横向溢出。桌面
  scrollWidth/clientWidth 为 1417/1417，手机为 367/367；宽表滚动留在表内。
  已恢复浏览器视口，任务标签未激活，未导出登录凭据。
- 一次新上下文视觉检查没有发现请求支持的返工问题。其收到的初版截图裁剪不全，
  因此未独立确认标题及全日期；这些已由现场 DOM、历史导航和只读查询确认。
  导出截图的空白边缘已修正，保留完整标题和首屏。

证据目录：
`/Users/yong/work/assertchecks-ws/assertchecks--ASSERT-59/.intentfold/tmp/ASSERT-59/`。
桌面、手机、项目页、用例及最早历史截图、`ui-proof.json`、`nsdk-proof.json` 均在
其中；主工作区 `.intentfold/tmp/ASSERT-59/` 另保留一份，避免清理工作树后丢失。

## 偏离

没有产品方案偏离。chore 不需要 plan/ac/grill。
仅为人工展示采用现有 dry-run 版本检查豁免，不编造历史部署 SHA；
保留 `synthetic-presentation` 来源元数据，不改变线上判定器或上传 API。
本地数据库驱动数组包装的校验兼容问题在演练阶段修复后继续。

## 环境

- 预览端口 63059，绑定 127.0.0.1，review 期间保留运行。
- 工作树 `/Users/yong/work/assertchecks-ws/assertchecks--ASSERT-59`。
- 分支 `codex/ASSERT-59-prod-live-data`；finish review。
- 环境键无新增、修改或删除；环境和凭据文件保持忽略。
- 本地自动开单及告警升级均关闭，没有通知、测试拨号或云资源变更。
- 不需要重新部署，线上读取与本地相同的数据。

## 清理

展示结束后运行一次：

```bash
bash /Users/yong/work/assertchecks-ws/assertchecks/.intentfold/tmp/ASSERT-59/cleanup-nsdk-prod-live.sh
```

该命令核对本次精确环境 ID、项目及环境指纹，并核对所有 run 指纹后删除环境，
依赖既有级联删除移除 run；不删除共享工单。重复执行不修改数据，slug 后来
被其他环境复用也不会被接管。环境或 run 被修改时拒绝删除。

## 剩余

BF 按用户要求未做；没有日后自动补数据任务。
尚未合并或关闭工单，等待人确认。展示环境已在真实 NSDK 可见。

## 检查

1. https://assertchecks.com/p/nsdk/checks/prod-live
   查看最新全绿卡片、91 个用例及每日历史是否适合演示。
2. https://assertchecks.com/p/nsdk/checks/prod-live?run=159
   查看 2026-10-16 的首日历史。

## 为你决定

- 9 个业务组按当前可选数量分配，保留全部 6 个 Authentication 和 5 个 Onboarding，
  其余为 Coach 15、Growth 8、Actions and Projects 7、Invoices and Bills 7、
  Overview and Reports 14、Transactions 15、Settings 14。
- 只选择近期 DEV 和 PROD 都通过、无共享工单或已知失败备注的用例。
- 日历史约在 05:03 至 05:05 UTC 开始，环境不设周期，未来不会 Late。
- 不填虚构 CI 链接或历史版本；清理工具只保留本地。
