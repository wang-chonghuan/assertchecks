# ASSERT-60 交付

## 改动
运行历史 Result 的现有小标签在完全通过时显示实际 passed/ran，
例如 `91/91 passed`；原有失败、未完成提示及样式不变。
只修改 `src/routes/_app/p/$project/checks/$check/index.tsx` 中的标签文字分支。
开发提交：`ec55fba`。

## 验收结果
- AC 1：工单验收项目的运行 #193 显示 `91/91 passed`，无 `0/91 failed`。
  #192 显示 `5/5 passed`；现有 sandbox #116 显示 `160/160 passed`，不是固定 91。
- AC 2：现有 sandbox #117 显示 `11/173 failed`；#94 仍为 Incomplete / `0/1 failed`。
  工单 #188 为 `1/3 failed`；#189 为 Incomplete / `0/3 failed · 3 incomplete`；
  #190 的全部用例通过但退出失败仍为 Incomplete / `0/3 failed`；
  #191 的零用例为 Incomplete / `0/0 failed`；#194 无结果只显示 Incomplete。
  #195 显示 Running；grace 为零的 #196 显示 Timed out。均无 passed 计数。
- AC 3：点击 #193 后 URL 带 `run=193`，摘要为 91 passed、0 failed、0 incomplete。
  1440x900 的页面 scrollWidth 为 1440；390x844 为 390；手机标签内部无溢出。
- 机械检查：`pnpm typecheck && pnpm test && pnpm check:infui && pnpm build` 退出 0，
  93 个现有测试通过。构建有依赖生成 CSS 和 `use client` 提示，但无构建失败。
- fresh-context 视觉判断：用户不会针对本次标签要求提出修改；桌面与手机均符合。

可复查证据在 git-ignored `.intentfold/tmp/ASSERT-60/`：
`ui-proof.json`、`fixture-receipt.json`、`fixtures.ts`、
`badge-desktop.png`、`badge-mobile.png`。浏览器断言可失败，并读取真实本地服务 DOM。

## 偏离
Chrome 扩展的本地导航未生效，页面仍在生产；没有把生产旧标签作为新代码证据。
正式 UI 断言使用独立 headless Chrome，以 sandbox 测试账号正常登录，不导出用户会话。
91 用例文案在同一页面的工单专属验收环境验证；NSDK 本地页面留给 owner 查看。
生产 NSDK prod-live 的 29 个 passed 运行只读确认，未写入或改动。

## 环境与数据
Web 端口 `63060`，预览进程 PID `29596`，日志 `tmp/ASSERT-60/dev.log`。
无新增、修改或删除环境变量；无依赖、主题、schema、核心判断或 API 变更。
工单验收项目 `assert-60`，项目 ID 41，检查 ID 47/48/49，运行 ID 188-196；
只授予现有 sandbox 测试账号和 owner，不配置自动工单或告警。
它与 NSDK prod-live 无关，可在结束评审后用管理 CLI 独立移除：
`pnpm admin project:remove assert-60 --confirm assert-60`。
第一次夹具准备失败时，仅删除了本次创建的项目 ID 40（三个空检查、零运行），再正确创建。
真实 NSDK、BF 数据和用户未改动；ASSERT-59 的数据清理工具未执行。

## 剩余
尚未合并、部署或关闭工单。独立浏览器不能证明未测试的 headed/OS 行为。

## 检查
无未解决视觉争议。本地直接查看：
`http://localhost:63060/p/nsdk/checks/prod-live`（owner）；
验收数据：`http://localhost:63060/p/assert-60/checks/prod-live?run=193`。

## 代你决定
- 所有完全通过的运行使用真实通过计数，不只针对 NSDK 或固定 91。
- 零失败但未完成、零用例、无结果、运行中及超时均不使用 passed 计数。
- 保留标签样式、失败计数及 incomplete 后缀。
