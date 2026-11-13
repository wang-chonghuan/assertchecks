# ASSERT-60

## 代码事实
- RunHistory 已收到 outcome、timedOut 和 ran/passed/failed/incomplete，不需查询新数据。
- 当前 Result 标签固定输出 failed/ran；OutcomeTag 另行保留未完成、运行中和超时状态。
- outcome 与用例计数有独立含义：版本变化或执行异常也可能使零失败运行不能通过。
- 已只读确认 NSDK prod-live 有 29 个 passed 运行；sandbox 有 passed、failed、incomplete 历史。
- ASSERT-42 的旧返工要求零失败显示绿色 failed 标签；当前用户明确修改全绿文案，以本次要求为准。

## 路线
在检查详情页 RunHistory 的现有标签中增加通过分支：
outcome 为 passed、未超时、ran 大于零、passed 等于 ran 时输出 passed/ran passed。
其余分支和 incomplete 后缀不变。不提取新抽象，不改变判断、读取、数据、样式或依赖。

## 验证与边界
运行 Charter 规定的机械检查；浏览器只读查看 NSDK prod-live 的新标签，
并查看 sandbox 失败及未完成历史。额外状态需要时仅使用 ticket-scoped 验收对象。
运行记录的数据不会被改写，主题及环境变量均不变，不合并或部署。
已逐项对照四份 Charter 的 Redlines：这一路线没有需要新增授权的动作。
