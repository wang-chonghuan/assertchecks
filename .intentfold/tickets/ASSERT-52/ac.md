# ASSERT-52 验收计划

本地 dev server 端口 63052，以 `sandbox+clerk_test@example.com` 登录，浏览器 1440×900，第 5 条另加 390×844。数据只写 sandbox：把 NSDK DEV 的真实运行（只读取出）原样通过推送接口重放到 sandbox/dev。

## AC1 部分挂单时显示需要开单数，且等于检查页

- 准备：把 NSDK DEV 今天的定时运行（11 个没通过，sandbox 里只有个别用例挂过单）重放为 sandbox/dev 的最新完整运行。
- 检查：项目页 `/p/sandbox` 的 DEV 卡片上显示 "K need a ticket"；打开 DEV 检查页，Not passed 列表里标 Needs a ticket 的用例个数等于 K，且 K 小于没通过的用例数。
- 为真：两个数相等，且至少有一个已挂单的失败用例没被计入。

## AC2 挂单后数量减一

- 在 DEV 检查页给一个 Needs a ticket 的用例挂一张真实工单（AssertChecks Sandbox 的 Plane 工单链接），回到项目页刷新。
- 为真：卡片上的数变成 K−1。

## AC3 全部已挂单时显示 0

- sandbox/prod 最近一次完整运行的 12 个没通过用例都已挂单。
- 检查：项目页 PROD 卡片显示 "0 need a ticket"，检查页 Not passed 列表里没有 Needs a ticket。
- 为真：显示 0，且检查页也没有需要开单的用例。

## AC4 全部通过时不显示

- 准备：先把 NSDK DEV 全部通过的定时运行（10-24）重放为 sandbox/dev 的最新完整运行，检查后再重放 AC1 用的运行。
- 为真：此时 DEV 卡片显示 "cases passed"，没有需要开单的字样。

## AC5 两种视口下可读

- 1440×900 和 390×844 下截图项目页。
- 为真：计数完整显示，不截断、不压住标题数字，没有横向滚动。
