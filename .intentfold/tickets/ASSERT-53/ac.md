# ASSERT-53 验收计划

本地 63053，无头 Chromium，首页不需要登录。改动前的度量在 `tmp/before-*`。

## AC1 390×844 下没有横向溢出
- `document.documentElement.scrollWidth` 等于 390。

## AC2 1440×900 下 hero 不变
- 标题与示例卡片的 left/top/width 与改动前（标题 152,81,593；卡片 793,123,495）相同，截图对照。

## AC3 390×844 下 hero 对齐不变
- 标题与示例卡片的 left/width 与改动前（16/358）相同。
