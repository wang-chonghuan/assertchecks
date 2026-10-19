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
  // Type, all measured on adsy.com: Space Grotesk (self-hosted in public/fonts/space-grotesk/).
  fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  fontSize: 16, // body, navigation, buttons
  fontSizeSM: 14, // card descriptions
  fontSizeLG: 20, // emphasised lead text, card titles
  fontSizeHeading1: 76, // hero headline
  fontSizeHeading2: 40, // section titles
  fontSizeHeading3: 30, // card headings
  fontSizeHeading4: 26, // block titles
  fontSizeHeading5: 20,
  lineHeight: 1.27,
  fontWeightHeading: 500, // headings and emphasis
  fontWeightDisplay: 400, // the hero headline
  fontWeightButton: 600,
  // The control height before the compact algorithm, which turns it into 32 px. Button needs it again
  // because its own algorithm would otherwise compact the already-compact height a second time.
  controlHeightSeed: 36,
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
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontSizeSM: style.fontSizeSM,
    fontSizeLG: style.fontSizeLG,
    fontSizeHeading1: style.fontSizeHeading1,
    fontSizeHeading2: style.fontSizeHeading2,
    fontSizeHeading3: style.fontSizeHeading3,
    fontSizeHeading4: style.fontSizeHeading4,
    fontSizeHeading5: style.fontSizeHeading5,
    lineHeight: style.lineHeight,
    fontWeightStrong: style.fontWeightHeading,
    controlHeight: style.controlHeightSeed,
  },
  components: {
    Button: {
      algorithm: true,
      controlHeight: style.controlHeightSeed,
      fontWeight: style.fontWeightButton,
      // Re-derived from Ant's 14 px seed otherwise; adsy's buttons are 16 px at every size.
      contentFontSize: style.fontSize,
      contentFontSizeLG: style.fontSize,
      contentFontSizeSM: style.fontSizeSM,
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
