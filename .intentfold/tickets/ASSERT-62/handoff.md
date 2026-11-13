# ASSERT-62 交付

## 改动

在项目页 **Alerts 选项卡**的 "Active alerts" 卡片中,为每条未确认升级显示其阶段化通知/通话明细。
数据来源是已有的 `ticket_escalations.log`(ASSERT-56 写入),ASSERT-57 当初未暴露,本次只读暴露。

- `src/lib/types.ts` — 新增 `AlertNote { at, stage, kind, ok, detail }`,`AlertItem` 增加 `notes: AlertNote[]`。
- `src/server/escalation.ts` — 新增纯函数 `parseAlertLog`(校验 jsonb 日志为 notes,丢弃未知/畸形条目);
  `onCallSummary` 的查询加选 `log` 并映射 `notes`。无新查询面,无密钥。
- `src/components/oncall-alerts.tsx` — 每条活跃告警下方渲染 notes:阶段→角色(Primary/Backup/Final)、
  方式(Slack/电话)、时间、是否发出,以及电话的 Call SID(`<Typography.Text code>`)。
- `tests/escalation.test.ts` — `parseAlertLog` 两个单测(保留 call/slack、丢弃未知 kind、非数组返回 [])。

无迁移(`log` 列自 013 已存在)、无新增依赖、无 env 变更。未触及升级引擎、定时器、severity 或 ASSERT-56/57 行为。

## 验收结果

- **AC3 通过**:typecheck 干净;95 个单测全过(含 2 个新 `parseAlertLog`);check:infui 无违规;build 成功。
- **AC2 通过**(代码层):`parseAlertLog` 只产出 `{at,stage,kind,ok,detail}`,detail 为 Call SID 或角色名;
  查询仅在既有 secrets-free 读取上多取 `log`;DTO 不含凭据/电话号码/邮箱。选项卡仍仅对已配置告警的项目显示。
- **AC1**:部署到生产后,对 bf 自身升级行实机核验(owner 截图)。按 owner 指令(马上上线、不要较真)
  未做隔离浏览器登录验收,改由生产实机 + owner 截图确认。

## 环境

- 票端口:web **63062**。
- 无新增 env key、无迁移、无 env 备份。
