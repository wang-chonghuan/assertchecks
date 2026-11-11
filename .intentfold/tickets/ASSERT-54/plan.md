# ASSERT-54 计划

## 代码里看到、工单没写的

- 开单只有一处：`src/server/ticket-platforms.ts` 的 `createTicket`，普通单和溢出单（`auto-tickets.ts`）都走它。标签加在这里，两种单都带上。
- 标签在目的地还不存在：Linear 里没有任何名字含 error 的标签；Plane 的 ACSANDBOX 也没有。
- Linear 的标签有工作区级和团队级两种，名字可以重复；Plane 标签按项目。
- 已开出的 15 张 Linear 自动单都在 ENG；其中 ENG-1823 已带 `fix`，补标签必须是追加，不能覆盖。
- nsdk 的自动开单按老板的说法已关；验收不能用 nsdk 的目的地开真实 NSDK 错误单。

## 路线

1. `ticket-platforms.ts`：新增按名称取得标签 ID 的一步，开单请求带上它。
   - Linear：查名字为 `production-error`（不区分大小写）的标签，优先本团队的，其次工作区级的；都没有就在该团队建一个。`issueCreate` 带 `labelIds`。
   - Plane：列项目标签，按名字找；没有就建。创建工作项带 `labels`。
   - 标签名一个常量，不可配置（工单约束）。
2. 选标签的纯函数加单元测试（名字匹配、团队优先、找不到）。
3. 补标签：用 n-linear 对 Linear 上标题以 “Production error” 开头的工单逐张追加（`issueAddLabel`），不碰已有标签。只这一种平台有已开出的真实单；ACSANDBOX 的旧测试单不补。
4. 机械防线：typecheck、测试、check:infui、build。
