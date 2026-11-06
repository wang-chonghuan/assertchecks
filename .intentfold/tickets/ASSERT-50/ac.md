# ASSERT-50 验收检查

1. `pnpm admin source:events bf bf_auth_recovery:outcome=failed` 设置成功，`pnpm admin list` 显示；错误格式被拒；不带参数清空后再设回。
2. 本地 63050 读 bf 的视图：出现问题 `bf_auth_recovery outcome=failed`，7 天和 90 天次数与 Log Analytics 直接按 operation 去重统计的次数一致。
3. `pnpm admin errors:auto bf --limit 1` 为它开出一张 Linear 单（benefits-finder，ENG，Qingyang Wang），#bf-errors 收到一条；再跑不重复。
4. nsdk、sandbox 视图的问题集合和次数与改动前相同（改动前后各读一次比对）。

机械防线：`pnpm typecheck && pnpm test && pnpm check:infui && pnpm build`。
