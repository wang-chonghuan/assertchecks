# ASSERT-53 计划

## 代码里看到、工单没写的

- 首页 hero 区 `src/routes/index.tsx` 的 `<Row gutter={[space.section, space.block]}>`：横向 48 px，antd 给 Row 左右各 −24 px 的外边距；手机上页面边距 `pageGutter` 最小 16 px，于是两边各外扩 8 px。改动前实测 390 宽下 `scrollWidth` 398。
- 两列是 `xs={24} lg={13}` / `lg={11}`，只在 lg 及以上并排；lg 以下横向 gutter 没有用处。
- antd 6 的 `useGutter` 在服务端（没有断点信息时）按最大断点取值，所以按断点写的 gutter 在桌面首屏就是 48，不会跳动。
- 页面上其他 Row 用 `space.group`（16 px），外扩 8 px 小于页面边距，不溢出。

## 路线

1. hero Row 的横向 gutter 改为按断点：`{ xs: 0, lg: space.section }`，纵向不变。
2. 不动 token，不动其他 Row。

## 红线查对

- ui.md 1：不改 `src/infui/` 的值。ui.md 2、3：不加库，不覆盖 `.ant-*`。
- 其余（依赖、迁移、数据）不涉及。
