# ASSERT-50 计划

## 代码里看到、工单没写的

- 问题只从 `AppExceptions` 来（`telemetry.ts` 的 `failures()`），再按 operation 去重、按 `ProblemId` 归组；自动开单和 Slack 都建立在这个视图上，所以声明的事件只要进入 `failures()`，后面全部自动生效。
- 噪声规则会把“与 4xx 请求同一 operation”的失败标成 client 噪声。浏览器事件和它触发的 401 请求可能共用 operation，声明的事件必须不受噪声规则影响，否则 BF 这个失败会被过滤掉。
- 现有三个错误源都没有设 roles；声明的事件不走 roles 过滤（前端事件没有 AppRoleName）。

## 路线

1. 迁移 `011_failure_events.sql`：`error_sources.failure_events jsonb`（`[{event, key, value}]`），加法。
2. `src/server/failure-events.ts`（纯函数）：解析 `event:key=value`，名称、属性和值只允许 `[\w.-]`；生成每条声明的 KQL 分支（问题键 `event key=value`，消息附 `error_class`，位置取 `page_path`）。
3. `telemetry.ts`：`failures()` 把声明分支 union 进来，标 `declared`，不参与噪声判断；缓存键带上声明。
4. `production-errors.ts`：把声明传给遥测。
5. `scripts/admin.ts`：`source:events <project> [event:key=value ...]` 设置或清空，`list` 显示。
6. 单测：解析和 KQL 生成。
7. README、engineering.md、operations.md 同步。

## 红线查对

- product 红线 2：只读遥测。engineering 红线 3：不加依赖；红线 4：只加列。operations 红线 2：只给 bf 配置，开单和 Slack 只用 bf 已有的设置（Linear benefits-finder，#bf-errors），owner 已指定。
