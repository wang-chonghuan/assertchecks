# ASSERT-57 handoff — 项目页值班与告警状态卡片

## What changed

一张只读「On call & alerts」卡片,挂在项目 **Production errors 标签页顶部**(BF only;未配置告警的项目不渲染)。

- `src/server/escalation.ts` — 新增 `onCallSummary(viewer, slug, now?)`:经 `queries.project` 做成员范围守卫;复用 `readAlertConfig` + `onCallRole`/`contactFor` 算本周+后两周值班;读 `ticket_escalations WHERE confirmed_at IS NULL` 的未确认升级;返回**无密钥 DTO**(绝不含 Twilio 凭据、电话、邮箱)。
- `src/server/fns.ts` — 新增 `getOnCallAlerts`(GET server fn,`requireViewer` + `found`)。
- `src/lib/types.ts` — 视图模型 `OnCallAlerts` / `OnCallWeek` / `AlertItem`。
- `src/components/oncall-alerts.tsx`(新)— Ant `Card`:「On call」(本周 + 后两周,姓名 + 角色标签 + week-of,非工作时间加一句提示)与「Active alerts」(severity 标签 + Ticket 链接 + 开始时间 + unacknowledged;无则 Empty「No active alerts」);loading=Skeleton,error=Alert;`configured:false` 渲染 null。
- `src/routes/_app/p/$project/index.tsx` — errors 标签 children 顶部挂 `<OnCallAlertsCard />`(懒加载,仅打开该标签时取数)。

## AC results（真实产品/浏览器验证，sandbox,登录 sandbox+clerk_test@example.com,Clerk dev 424242)

- **1 值班展示** — PASS:/p/sandbox?tab=errors 顶部出现卡片,本周 = Carol Final(+Final 标签,因今天早于 11/16 钳到第一周=final),另列 11/23 Alice Primary、11/30 Bob Backup;只显示姓名,无电话。
- **2 告警状态** — PASS:初始「No active alerts」;插入一条未确认 critical 升级后刷新 → 列出 Critical 标签 + Ticket 链接(href=工单 url)+「opened … unacknowledged」;置 `confirmed_at` 后刷新 → 消失;测试行已删。
- **3 不泄密** — PASS:抓 `getOnCallAlerts` 真实网络响应,顶层仅 `configured/workingHours/onCall/alerts`;onCall 项仅 `weekOf/role/name`,alerts 项仅 `url/severity/openedAt/stage/lastCallAt`;无 twilio/secret/apiKey/phone/email/slack_id(尽管库中联系人有电话/邮箱/slack_id)。
- **4 未配置不显示** — PASS:临时建 `ac57probe`(无告警配置)打开其 errors 标签,无该卡片,生产错误内容照常;探针项目已删。
- **5 只读** — PASS:卡片只有文本/标签/Empty/Skeleton + 一个外链 Ticket,无可改配置或拨号的控件。
- **6 移动端** — PASS:390×844 下无横向页面滚动,卡片堆叠渲染。
- **机械防线** — PASS:typecheck、单元测试(fail 0)、check:infui、build、antd lint(0 issues)。

截图在 `.intentfold/tmp/ASSERT-57/` 外的会话 scratchpad(ac1/ac2/ac4/ac6),验证由隔离子代理对抗式执行,无缺陷。

## Deviations

无。按 plan 实现;`onCallSummary` 放进 `escalation.ts`(数据归属模块)而非 `queries.ts`,以避免 queries↔escalation↔production-errors 循环引用,同时仍经 `queries.project` 做成员范围守卫——符合 engineering 红线 6(成员范围读的守卫在 queries)。

## Environment

- 无新增运行时 env key、无迁移(复用 013 已有表/列)。
- 本票端口:web **63057**(验证模式下保持运行供 review)。
- 为验证给 **sandbox** 写了一份告警配置(轮值 final/primary/backup、起始 2026-11-16、测试联系人 Alice/Bob/Carol,**无 Twilio**),**特意保留**供 owner 经 /p/sandbox review 卡片;非真实客户数据,可随时用 `pnpm admin` 清除。

## Residual

- 卡片位置暂定 Production errors 标签顶部;review 时若 owner 想移到别处(如项目默认视图或独立标签),是小改。
- 仅展示当前未确认升级,无历史/汇总(按"简洁不爆炸")。

## Check（给人工看的点）

- 卡片的信息密度与排版是否够简洁(owner 要求不爆炸)。
- 卡片放在 Production errors 标签顶部是否合适,还是想换位置。

## Decided for you

- 位置:Production errors 标签顶部(不新建标签、不改 URL 搜索参数)。
- 值班显示本周 + 后两周共 3 条,显示姓名与 week-of(UTC),不显示电话。
- 仅已配置告警的项目渲染卡片;未配置(nsdk 等)不显示。
- 只显示当前未确认升级,无历史。
- `onCallSummary` 置于 escalation.ts(避免循环引用),仍走 queries.project 守卫。
