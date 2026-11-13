# ASSERT-57 plan — 项目页值班与告警状态卡片

## 现状（读码所得，工单未说的部分）

- 单项目页:`src/routes/_app/p/$project/index.tsx`,Ant `<Tabs>`(`tests` / `errors`),`errors` 标签懒加载 `<ProductionErrorsTab project={slug} />`,组件自己调 server fn 取数。
- Server fn 机制:`src/server/fns.ts` 的 `createServerFn`;`requireViewer()` 取登录用户(成员或域组都可),`found()` 把 null 变 404;成员范围读在 `src/server/queries.ts` 的 `project(viewer, slug)`(成员 id 或域组邮箱命中,未命中返 null)。只读用 `project(...)`,不要用只给编辑的 `memberProject`。
- 组件取数模板:`src/components/production-errors.tsx`(useState+useEffect 调 fn;Alert/Skeleton/Empty 三态;infui tokens:`space`、`text`、`ASSERTCHECKS_STYLE`、`theme.useToken()`)。`check-summary.tsx` 是更小的 token 范例。
- 可复用:`escalation.ts` 的 `onCallRole / onCallContact / onCallIndex`、`readAlertConfig(projectId)`、`contactFor`、类型 `Role/Contact/AlertConfig`。`ticket_escalations` 读模板见 escalation.ts(未确认 = `confirmed_at IS NULL`)。`alert_config` / `ticket_escalations` 目前**没有任何 UI 读**,这是第一处。
- 工单↔升级的关联键是 `ticket_escalations.url`(无 FK)。
- **安全要点**:`AlertConfig` 含 Twilio 密钥和联系人电话/邮箱。给前端的 DTO **只带**:是否已配置、值班角色+姓名、告警的 url/severity/时间/阶段;**绝不带**密钥、电话、邮箱。

## 方案

一张只读卡片放在 **Production errors 标签页顶部**(告警本就属生产错误语境;放在项目下、成员可见)。未配置告警的项目(如 nsdk)该卡片**不渲染**。

- `src/server/queries.ts` 增 `onCallSummary(viewer, slug)`:`project(viewer,slug)` 守卫 → null 则返 null(→404);可见但无 `alert_config` → `{configured:false}`;否则用 `readAlertConfig(found.id)` 取轮值,算本周+后两周值班(`onCallRole`+`contactFor`),并读 `ticket_escalations WHERE project_id=… AND confirmed_at IS NULL` 的未确认升级;返回**无密钥 DTO**。
- `src/server/fns.ts` 增 `getOnCallAlerts`(GET):`found(await onCallSummary(await requireViewer(), data.project))`。
- `src/components/oncall-alerts.tsx`(新,Ant `Card`):两段——「On call」本周值班人 + 后两周;「Active alerts」未确认升级(severity 标签 + 工单链接 + 开始时间 + 简短状态),无则 Empty「No active alerts」。loading/error 态照 production-errors.tsx。`configured:false` 时渲染 `null`。
- `index.tsx` 的 `errors` 标签 children 顶部挂 `<OnCallAlerts project={project.slug} />`。

## 切片

1. server:`onCallSummary` + DTO 类型(放 `src/components/types.ts` 视图模型处或 queries 导出)+ `getOnCallAlerts` fn。
2. 组件 `oncall-alerts.tsx`(两段 + 三态 + tokens)。
3. 挂到 errors 标签顶部。
4. 验证:bf 项目页 Production errors 标签看到卡片(本周值班 = 本周应为 Chonghuan,因 11/16 前钳位到第一周=final);造一条 sandbox 未确认升级验证「Active alerts」与空态;nsdk/未配置项目不渲染;非成员 404;机械防线。

## Redline 核对（动代码前）

- ui.md:不加组件库、不改 `src/infui/` 主题值、不用 `.ant-*`/`!important`——卡片只用 Ant + 现有 tokens,**合规,无需审批**。
- engineering.md redline 6:成员范围读只走 `queries.ts` 的 `project(...)`——合规。无新依赖。
- product.md / operations.md:只读展示、成员范围、不动部署——无触及。

无红线需要人工批准。

## Decided(未达 grill 门槛，自行决定，记此）

- 位置:Production errors 标签页顶部(非新建标签,不改 validateSearch)。review 时可按 owner 要求移位。
- 值班展示:本周 + 后两周共 3 条,显示姓名与「week of」日期;不显示电话。
- 卡片仅在项目已配置告警时渲染;未配置(nsdk 等)不显示。
- 只展示**当前未确认**的升级,不做历史/汇总(保持简洁)。
