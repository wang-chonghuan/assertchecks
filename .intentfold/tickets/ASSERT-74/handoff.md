# ASSERT-74 handoff：恢复显示 NSDK 和 BF 的 prod 卡片

## 做了什么

这是 chore，没有改代码。在共享生产库上执行了 `pnpm admin check:show nsdk prod`，把 ASSERT-63 隐藏的 NSDK PROD 检查重新放回项目总览。BF 唯一的生产检查是 `prod-smoke`，它的 `hidden` 一直是 false，线上也一直在显示；BF 从来没有过叫 prod 的检查，所以 BF 不需要操作。

## 验收

1. 线上 https://assertchecks.com/p/nsdk 的 Tests 选项卡显示 DEV、Local、PROD、prod-live 四张卡片。PROD 显示「14 failed of 167 cases tested」，它的运行历史都还在。
2. 线上 https://assertchecks.com/p/bf 的 Tests 选项卡显示 prod-smoke 和 security-live。
3. `pnpm admin list` 显示 BF 和 NSDK 的所有检查 `hidden` 都是 false。

## 说明

- 没有代码改动，所以没跑机械检查（typecheck、test、infui、build）；数据库变更执行后立刻生效，也不需要部署。
- 要再藏起来，运行 `pnpm admin check:hide nsdk prod`。
