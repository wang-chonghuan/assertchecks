# ASSERT-60 验收执行计划

要求以 Plane 上的实时工单为准。

## AC 1
在本地预览打开 NSDK prod-live，定位 Run history 表格。
可见行结果为 91/91 passed，且没有 0/91 failed；换页仍显示真实计数。
另查看 sandbox 的非 91 用例通过运行，确认计数不是硬编码。

## AC 2
打开 sandbox 的历史失败及未完成运行，逐行核对结果小标签。
失败显示失败数，未完成保留 OutcomeTag 和 incomplete 数，不含全部通过标签。
对运行中、超时、无结果及零用例使用 ticket-scoped 数据或聚焦渲染检查；
不写入 NSDK 或 BF。运行中、超时、无结果或零用例均不得输出 passed 计数。

## AC 3
在 operations.md 指定的两个视口查看历史表格，检查标签边界及页面宽度；
点击已展示的历史行，URL 和展示的运行均切换到该行。保存截图与可失败的 DOM 断言。
