# ASSERT-58 开发计划

## 代码观察

`ProductionErrorsTab` 的各分组共用 Table 构造函数，展开内容都经过
`ProblemDetail`。该组件已有统一的纵向 Flex，但外层没有缩进；内部包含工单、
Descriptions、消息变体表和堆栈。父行已遵循 ASSERT-36 的右侧展开按钮和紧凑行距。

## 路线

1. 在 `src/components/production-errors.tsx` 的详情外层 Flex 上增加
   `paddingInlineStart: space.block` 和 `paddingBlock: space.stack`。
2. 保留所有内部内容和事件处理，父行不移动，不改 Table 的展开配置。
3. 在 sandbox 的真实错误和慢请求上检验层级、折叠交互及两种规定视口，
   执行 Charter 的机械检查和 Ant lint，再交付预览。

## 已查红线

仅使用已有 token，不改 `src/infui/`、依赖、生成文件或服务端行为。
验证使用隔离的 sandbox 测试会话；不操作真实项目数据、通知或云资源。
环境文件和截图等临时证据不提交。Finish 为 review，不合并或部署。
