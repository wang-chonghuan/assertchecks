# ASSERT-56 acceptance checks

用可控时间 + 模拟 Twilio/Slack/Linear 验证时间线；真实试拨只拨 owner 本人号（已授权）。

1. **分级判定**：给解读模型“服务不可用”类遥测 → severity=critical；普通报错 → urgent 或 low，不为 critical。severity 存库、工单可见。
2. **critical 工作时间内时间线**：工作时间（爱尔兰 Mon–Fri 09:00–17:30）内建单的 critical 工单，建单即 Slack `<@Qingyang>` 到 #bf-errors 并对 primary 发起呼叫（记 call sid）；+15min 未确认 → `<@Yafei>` + 呼叫；+30min 仍未 → `<@Chonghuan>` + 呼叫；每级一次、不循环。
2b. **critical 工作时间外（轮值）**：非工作时间的 critical，只 @ 并呼叫本周值班人（按 `rotation` + `rotation_start` 计算，每周一 09:00 换班，顺序 final→primary→backup = Chonghuan→Qingyang→Yafei），未确认则约每 15 分钟对同一人重拨，不惊动另外两人；满 24h 无确认则停止自动重拨。可控时间断言：给定 `rotation_start`，不同周 `onCallIndex/onCallRole` 落在对的人；`recallDue` 首次为真、之后满 15 分钟才再真。
3. **urgent 时间线**：urgent 工单建单即 Slack `<@Qingyang>`；工作时间内累计满 1h 未确认 → `<@Yafei>` + 呼叫；非工作时间不计不拨（轮值不影响 urgent，urgent 永不在非工作时间拨号）。
4. **low**：low 工单开单并发一条 Slack，不建升级行、不呼叫、不升级。
5. **确认**：三人之一在本次通知之后于对应 Linear 工单留人工回复 → 停止后续升级；旧回复、自动回复、他人回复不算；接通/响铃/Slack 成功不算确认。
6. **重启恢复**：重启后按已记录 stage 继续，不重复已发级；某级发送失败被记录，不致重复开单、不计为确认。
7. **一套升级/工单**：同一工单（含多个 error 的 overflow）只有一套升级记录。
8. **不影响既有**：非 BF 链路、BF 原生直接 Slack 告警、采集/分类/去重/开单规则均未变；low 的行为与现状一致（开单+一条 Slack）。
9. **通知内容**：含环境、简短问题、工单链接、当前需谁响应；不含用户敏感信息。
10. **Twilio**：呼叫用 API Key 鉴权、Timeout≈12s、接通即挂、不录音/不放语音/不启用 AMD；只拨配置号码；一次真实试拨到 owner 本人号成功（owner 在场确认）。**已完成 2026-11-12**：从 +18064500923 真实拨 +353830091396，owner 确认手机响铃(Twilio 状态 no-answer/无错误码,即设计的短响)。
11. **机械防线**：typecheck、单元测试、check:infui、build 通过。
