import type { ThemeConfig } from 'antd'

// The single theme authority. Only deliberate overrides live here; everything else is Ant's default.
export const theme: ThemeConfig = {
  // A fixed key keeps the CSS-variable scope class identical in the pre-rendered stylesheet and SSR markup.
  cssVar: { key: 'ac' },
  token: {
    colorPrimary: '#3b5bdb',
    borderRadius: 8,
  },
}
