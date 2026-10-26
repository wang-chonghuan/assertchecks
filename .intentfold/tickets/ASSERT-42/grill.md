# ASSERT-42 grill

没有问题达到需要问人的门槛：全部是可回退、做出来就能看的界面改动。以下由 agent 决定，按 owner 看过后再调。

## Decided for you

1. 第 12 条统一说法：用测试那边的 Needs a ticket / In progress；生产报错不说 Fixed（charter：AssertChecks 不声称报错已解决），另保留 Not handling。依据：工单 Proposed solution。
2. 第 2 条：每行只留一个"更多"菜单。依据：清单建议之一，最省地方。
3. 第 3 条：去掉 Run details 折叠，历史表格的运行号旁链接到 CI 运行。退出码只在未完成时有用，失败原因已显示在卡片里。
4. 第 4 条：去掉 Home；登录后点品牌回到项目。依据：已登录的人要回项目。
5. 第 5 条：Plane 链接里没有单号，显示"Plane ticket"，完整链接放在悬停提示里。依据：不调 Plane API（charter：不接工单系统）。
6. 第 10 条：未挂单且 7 天没出现的，和 30 天以上没出现的，合并成一个"Not seen recently"折叠组。
7. 第 13 条：check 页用"项目 / check 名"作为页面标题，卡片不再有标题。
8. 第 14 条：只在数字说明不了时显示状态标签（Late、New、Incomplete、Running、Timed out）。
9. 第 19 条：首页加一节 "What you see"，两张卡片介绍 bug 挂单和生产报错，标题不含逗号。
