# ASSERT-44 验证

## AC1：原样上传已脱敏报告

使用只有脱敏占位符的原生 Playwright 报告验证客户端 report 请求。
成功条件：完整 result 与输入报告相同，既不替换报告也不生成无结果错误。
保留无报告时的原有失败行为。

## AC2：接收、判断和保留报告

在工单本地服务中使用 sandbox 检查项执行 start、report、check 和无令牌
check。报告含 Authorization 与 Bearer 脱敏占位符，不使用真实项目报告。
成功条件：报告有效并得到正常 passed/failed 判断，失败文本和原始报告可读回。
不写入 NSDK 或 BF，不重跑它们的测试。

## AC3：保留其它校验与更新公开说明

执行工程 Charter 的 typecheck、test、check:infui、build。
检查无报告、错误格式、未完整执行、失败 case、无令牌和错误令牌的结果。
成功条件：它们不能因本次改动被判为通过，公开说明不再承诺关键词拦截。
实际凭据仍由项目脱敏，AssertChecks 的令牌存储和访问控制不变。
