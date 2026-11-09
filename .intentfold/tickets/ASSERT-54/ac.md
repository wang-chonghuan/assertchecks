# ASSERT-54 验收计划

## 1. Linear 新单带标签（含标签不存在时自动建）
用工单分支的 `createTicket` 和 owner 的 Linear key，在 ENG 开一张标题写明测试的单；回读该单标签含 `production-error`。建单前 ENG 没有该标签时，回读确认标签已被建出。测试单随后删除（Linear 回收站）。

## 2. Plane 新单带标签
`pnpm admin errors:auto sandbox --limit 1`（sandbox 目的地是 Plane ACSANDBOX，还没有该标签）；回读新开出的 ACSANDBOX 单，`labels` 含 `production-error` 的 ID，项目标签列表里出现该标签。

## 3. 已开出的自动单补齐
用 n-linear 查标题以 “Production error” 开头的全部 Linear 工单，每张的标签都含 `production-error`，原有标签（如 ENG-1823 的 `fix`）仍在。
