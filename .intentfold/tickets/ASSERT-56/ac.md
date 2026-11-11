# ASSERT-56 acceptance checks

用可控时间 + 模拟 Twilio/Slack/Linear 验证时间线；真实试拨只拨 owner 本人号（已授权）。

1. **分级判定**：给解读模型“服务不可用”类遥测 → severity=critical；普通报错 → urgent 或 low，不为 critical。severity 存库、工单可见。
2. **critical 时间线**：critical 工单建单即 Slack `<@Qingyang>` 到 #bf-errors 并对 primary 发起呼叫（记 call sid）；+15min 未确认 → `<@Yafei>` + 呼叫；+30min 仍未 → `<@Chonghuan>` + 呼叫；每级一次、不循环；夜间同样。
3. **urgent 时间线**：urgent 工单建单即 Slack `<@Qingyang>`；工作时间内累计满 1h 未确认 → `<@Yafei>` + 呼叫；非工作时间不计不拨。
4. **low**：low 工单开单并发一条 Slack，不建升级行、不呼叫、不升级。
5. **确认**：三人之一在本次通知之后于对应 Linear 工单留人工回复 → 停止后续升级；旧回复、自动回复、他人回复不算；接通/响铃/Slack 成功不算确认。
6. **重启恢复**：重启后按已记录 stage 继续，不重复已发级；某级发送失败被记录，不致重复开单、不计为确认。
7. **一套升级/工单**：同一工单（含多个 error 的 overflow）只有一套升级记录。
8. **不影响既有**：非 BF 链路、BF 原生直接 Slack 告警、采集/分类/去重/开单规则均未变；low 的行为与现状一致（开单+一条 Slack）。
9. **通知内容**：含环境、简短问题、工单链接、当前需谁响应；不含用户敏感信息。
10. **Twilio**：呼叫用 API Key 鉴权、Timeout≈12s、接通即挂、不录音/不放语音/不启用 AMD；只拨配置号码；一次真实试拨到 owner 本人号成功（owner 在场确认）。
11. **机械防线**：typecheck、单元测试、check:infui、build 通过。
