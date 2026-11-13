# ASSERT-58 交付

## 改动

`src/components/production-errors.tsx` 的 `ProblemDetail` 外层增加已有 token 的
起始侧缩进和上下留白。工单、元信息、消息表及堆栈共用该层级；
父行、右侧展开按钮、行点击和服务端行为保持不变。

## 验收结果

- **AC1：通过。** 隔离 headless Chrome / Playwright 登录 Charter 指定的 sandbox
  账号，读取实际 BF 遥测。慢请求 `2300` 和带工单错误 `2274` 的详情均比父行
  内容右移 24px，上下 padding 均为 8px。错误详情包含工单 ACSANDBOX-17、
  时间、位置、两个消息变体和完整堆栈；慢请求包含时间、位置和 p95 信息。
- **AC2：通过。** Needs a ticket、In progress 和 Not seen recently 的实测缩进
  均为 24px；Not handling 为空（0），没有为验证改变数据。行点击与图标均完成
  折叠及再次展开。工单 href 保留；点击 Remove 显示确认后取消，链接仍在，
  未提交移除或其他业务写入。
- **AC3：通过。** 1440x900 和 390x844 的页面 scrollWidth/clientWidth
  分别为 1440/1440 和 390/390。手机宽表为 640px，滚动容器 324px，
  overflow-x 为 auto，横向滚动位于表格内。手机也通过图标完成折叠及再展开，
  详情保持完整。桌面和手机截图由独立新上下文视觉检查确认，无请求支持的返工项。
- **机械检查：通过。** Charter 的
  `pnpm typecheck && pnpm test && pnpm check:infui && pnpm build` 全部成功；
  Ant lint 0 issues。构建有依赖的 `use client` 指令提示及 CSS 提取的弃用提示，
  未导致检查失败。

可复查截图和浏览器测量位于本工作树
`.intentfold/tickets/ASSERT-58/tmp/`：`desktop-slow.png`、`desktop-error.png`、
`mobile-slow.png`、`mobile-error.png`、`evidence.json`（临时证据未提交）。
使用隔离 headless 会话是为了避免干扰人的已登录浏览器；会话已关闭。

## 偏离

实现未偏离计划。首次浏览器验收受本机 Node 到 Clerk 的网络连接超时阻塞；
IPv4 探测可连通，因此仅为本次预览增加 Node 启动参数
`--no-network-family-autoselection --dns-result-order=ipv4first` 后继续验收。
没有修改认证逻辑、配置文件或依赖。

## 环境

- 实际 web 端口：63058，绑定 127.0.0.1，review 期间保留运行。
- 启动：按 operations 的 ticket 命令生成 Ant CSS 后，运行
  `node --no-network-family-autoselection --dns-result-order=ipv4first --env-file-if-exists=.env node_modules/vite/bin/vite.js dev --port 63058 --strictPort --host 127.0.0.1`。
- 环境键无新增、修改或删除；复制的环境及凭据文件保持 git-ignored。
- 自动开单和告警定时器在本地均为 off，未发通知、开业务工单或拨号。
- 工作树：`/Users/yong/work/assertchecks-ws/assertchecks--ASSERT-58`。
- 分支：`codex/ASSERT-58-error-detail-indent`；Finish：review。

## 剩余

无本工单遗留项。尚未合并、部署或关闭工单，等待人的视觉确认。

## 检查

1. http://127.0.0.1:63058/p/sandbox?tab=errors&problem=2300
   查看慢请求展开后详情的缩进和留白；未登录时使用本地登录入口。
2. http://127.0.0.1:63058/p/sandbox?tab=errors&problem=2274
   查看普通错误的工单、时间、消息和堆栈是否具有清晰子层级。

## 为你决定

- 使用已有 token，整块详情向右缩进 24px，上下各留白 8px。
- 保留紧凑父行、右侧展开按钮和分组密度，只移动子内容。
- 验证使用已有 sandbox 遥测和隔离会话，不提交业务变更。
