# ASSERT-57 acceptance checks

浏览器在本票端口(63057)验证;必要处用命令/DB 佐证。sandbox 用于造未确认升级数据,测试后清理。

1. **值班展示**:登录后打开一个已配置告警的项目的 Production errors 标签,顶部有一张"值班/告警"卡片,显示**本周值班人**以及接下来一两周的轮值(姓名 + week of 日期)。按 2026-11-16 09:00 起、顺序 final→primary→backup,当前(11/16 之前钳位第一周)本周应为 Chonghuan。
   - 查:浏览器打开卡片;对照 `pnpm admin alerts:show <project>` 的 rotation/rotation_start 与联系人,值班人正确。

2. **告警状态**:同一张卡片显示当前未确认的升级——每条有工单链接、severity、开始时间与简短状态;**没有进行中升级时显示明确空态**(如 "No active alerts")。
   - 查:先在空态下看到空提示;再在 sandbox 造一条 `confirmed_at IS NULL` 的 `ticket_escalations` 行,刷新后卡片列出该条(severity/链接/时间);把它 `confirmed_at` 置非空后刷新,该条消失。测试数据用后删除。

3. **只读且不泄密**:卡片无任何可改配置/拨号的控件;页面(含网络响应)**不含** Twilio 密钥、联系人电话或邮箱。
   - 查:浏览器看无编辑控件;看该 server fn 的网络响应 JSON 只含姓名/角色/工单元数据,无 `twilio`/`phone`/`email`/密钥字段。

4. **权限**:仅该项目成员或其邮箱域组可见;非成员访问该项目页得到 404(沿用现有范围)。
   - 查:以 sandbox 成员账号可见;用一个非成员账号(或临时移除成员)访问返回 404 / 看不到该项目;读走 `queries.ts` 的 `project(viewer,slug)`。

5. **未配置项目不显示**:对没有告警配置的项目(如 nsdk),卡片不渲染(不报错、不显示空壳)。
   - 查:打开一个无 `alert_config` 的项目的 Production errors 标签,顶部无该卡片。

6. **机械防线**:`pnpm typecheck && pnpm test && pnpm check:infui && pnpm build` 通过。
