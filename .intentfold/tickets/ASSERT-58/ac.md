# ASSERT-58 验证计划

## AC1

在 sandbox Production errors 展开真实慢请求和普通错误。通过浏览器测量，
详情内容左边缘比对应父行首列内容向右 24px，容器上下各增加 8px 留白。
检查时间、位置、消息表、堆栈和已有工单都属于同一个缩进容器，截取可见效果。

## AC2

在具有数据的分组中点击行展开、右侧图标折叠，再点击图标展开。
确认工单 href、详情内容和操作入口保留；打开移除确认后取消，不写入数据。
对各有数据分组测量相同缩进；空分组不伪造测试数据。

## AC3

分别在 1440x900 和 390x844 检查展开详情。断言页面
`scrollWidth <= clientWidth`，详情保持完整、不重叠；
检查宽表的横向滚动限制在表格内部，并在手机上滚动到展开按钮完成折叠及再展开。
使用隔离 headless Playwright 会话，避免干扰人的已登录浏览器。

## 必需检查

按 `.intentfold/charter/engineering.md` 的 Mechanical defence 执行，
并按 `.intentfold/charter/ui.md` 执行 Ant lint。最终从用户原始请求和截图进行一次
独立视觉检查。
