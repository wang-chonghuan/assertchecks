import { theme as antdTheme, type ThemeConfig } from 'antd'

// The only place custom theme values are declared (charter/ui.md). Colours follow the adsy.com palette
// measured in ASSERT-16, with the roles the owner confirmed; everything not listed is Ant's default.
export const ASSERTCHECKS_STYLE = {
  // Theme colour: links, selected tabs, focus rings and the logo tile.
  primary: '#3e4fea',
  // Primary buttons. Deliberately not the theme colour; Ant derives hover and active shades.
  button: '#112c3e',
  text: '#112c3e',
  // adsy's #677f9b darkened to reach 4.5:1 on the page background.
  textSecondary: '#5c728c',
  textTertiary: '#5c728c',
  // adsy's #677f9b reaches only 4.13:1 on white, so placeholders use the secondary colour too.
  textPlaceholder: '#5c728c',
  pageBg: '#f4f7f9',
  cardBg: '#ffffff',
  headerBg: '#ffffff',
  tagBg: '#e2e6f8',
  tagText: '#112c3e',
  none: 'transparent',
  noShadow: 'none',
  radius: 6,
  // Compact density: Ant's compact algorithm plus these sizes.
  cardRadius: 12,
  cardPadding: 16,
  cardHeaderHeight: 44,
  headerHeight: 52,
  statisticValue: 20,
  statisticTitle: 12,
  // Ant's default control height. The compact algorithm turns it into 28 px; Button needs it again
  // because its own algorithm would otherwise compact the already-compact height a second time.
  controlHeightSeed: 32,
  pillRadius: 999,
} as const

const style = ASSERTCHECKS_STYLE

export const theme: ThemeConfig = {
  // A fixed key keeps the CSS-variable scope class identical in the pre-rendered stylesheet and SSR markup.
  cssVar: { key: 'ac' },
  // Compact: smaller controls, paddings and margins across every component and every token.padding/margin.
  algorithm: [antdTheme.defaultAlgorithm, antdTheme.compactAlgorithm],
  token: {
    colorPrimary: style.primary,
    // Set explicitly, or links and info fall back to Ant's default blue.
    colorLink: style.primary,
    colorInfo: style.primary,
    colorText: style.text,
    colorTextSecondary: style.textSecondary,
    colorTextTertiary: style.textTertiary,
    colorTextPlaceholder: style.textPlaceholder,
    colorBgLayout: style.pageBg,
    colorBgContainer: style.cardBg,
    borderRadius: style.radius,
    borderRadiusLG: style.cardRadius,
  },
  components: {
    Button: {
      algorithm: true,
      controlHeight: style.controlHeightSeed,
      colorPrimary: style.button,
      // The button algorithm re-derives text from Ant's black seed; default and text buttons keep body text.
      colorText: style.text,
      borderRadius: style.pillRadius,
      borderRadiusLG: style.pillRadius,
      borderRadiusSM: style.pillRadius,
      primaryShadow: style.noShadow,
      defaultShadow: style.noShadow,
      dangerShadow: style.noShadow,
    },
    Tag: {
      defaultBg: style.tagBg,
      defaultColor: style.tagText,
      colorBorder: style.none,
      borderRadiusSM: style.pillRadius,
    },
    Card: {
      colorBorderSecondary: style.none,
      headerHeight: style.cardHeaderHeight,
      headerPadding: style.cardPadding,
      bodyPadding: style.cardPadding,
    },
    Statistic: { contentFontSize: style.statisticValue, titleFontSize: style.statisticTitle },
    // Fields share the pill shape so controls in one form match.
    Input: { borderRadius: style.pillRadius, borderRadiusLG: style.pillRadius, borderRadiusSM: style.pillRadius },
    Select: { borderRadius: style.pillRadius, borderRadiusLG: style.pillRadius, borderRadiusSM: style.pillRadius },
    Segmented: { borderRadius: style.pillRadius, borderRadiusLG: style.pillRadius, borderRadiusSM: style.pillRadius, borderRadiusXS: style.pillRadius },
    Layout: { bodyBg: style.pageBg, headerBg: style.headerBg, headerHeight: style.headerHeight },
    Table: { rowHoverBg: style.pageBg },
    Tabs: { itemColor: style.textSecondary },
    Menu: { itemColor: style.textSecondary },
  },
}
