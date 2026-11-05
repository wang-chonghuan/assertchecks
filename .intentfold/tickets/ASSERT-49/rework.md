# ASSERT-49 返工

交接（`handoff.md`）之后只有一轮返工。

## 第 1 轮

owner：“你只处理bf的，只处理bf-errors这个channel。之前开的bf的bug单子全部关了。现在自动开一个，发到channel里”

代码（cadaf69）：
- `pnpm admin errors:auto <project> --limit <n>`：最多开 n 张，按出现次数从多到少，用于第一次谨慎地开单。
- 网络中断或平台临时故障（`fetch failed`、超时、HTTP 429/5xx）下一轮自动重试，不再等设置改动；被拒的密钥或请求仍等设置改动后再试。失败原因附上底层错误码（如 `ETIMEDOUT`）。

数据和外部系统（不在代码里）：
- nsdk 和 sandbox 的自动开单与 Slack 设置清空，只剩 bf。
- Plane ACSANDBOX-1 至 16 全部设为 Cancelled。
- bf 的去向：Linear benefits-finder（ENG），指派 Qingyang Wang，用 owner 的 Linear key；Slack 指向 #bf-errors（频道名 `#bf-errors`，直接写入，没有发测试消息）。
- `errors:auto bf --limit 1` 开出 ENG-1803（redis.exceptions.TimeoutError），#bf-errors 收到一条消息。

复查：上面那次真实开单即为验收 2、3、4 在 bf 上的复查（指派、项目、team、解读、Slack 无错误、问题移入 In progress）。第一次尝试因本机 Node 连接 Linear 的 250 ms 选址超时失败，用 `--network-family-autoselection-attempt-timeout=2000` 重跑成功；这是本机网络问题，与代码无关。

净效果：相对冻结的交接，自动开单只对 bf 生效；部署后线上定时器会把 bf 其余 7 个需要工单的报错开给 Qingyang，并在 #bf-errors 各发一条。

另外记录：交接后的 Slack 清理。之前验收往 #bf-errors 发了 26 条消息（该 webhook 实际指向 #bf-errors，不是测试频道）。webhook 消息只有工作区管理员能删，bot token 和 edwinbiz 的 user token 都返回 `cant_delete_message`，未删除。
