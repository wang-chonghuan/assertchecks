import { theme as antdTheme, type ConfigProviderProps, type ThemeConfig } from 'antd'

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
  // Line height for each type size, in px, every one a multiple of 4: text at 1.4–1.5 times its size,
  // headings tightening as they grow. Ant takes ratios, derived in `theme` below.
  lineHeightSM: 20, // 14 px: body text (the compact algorithm sets body to 14), captions, tags
  lineHeightBase: 24, // 16 px: button and navigation labels
  lineHeightLG: 28, // 20 px: lead text, card titles, Heading 5
  lineHeightHeading4: 32, // 26 px
  lineHeightHeading3: 36, // 30 px
  lineHeightHeading2: 48, // 40 px
  lineHeightHeading1: 80, // 76 px
  // Single-line display text, where line spacing never shows: the big pass count and the wordmark.
  lineHeightSingle: 1,
  fontWeightHeading: 500, // headings and emphasis
  fontWeightDisplay: 400, // the hero headline
  fontWeightButton: 600,
  // The control height before the compact algorithm, which turns it into 32 px. Button needs it again
  // because its own algorithm would otherwise compact the already-compact height a second time.
  controlHeightSeed: 36,
  pillRadius: 999,
  // Page frame, shared by every page and section through src/components/page-frame.ts: the content
  // column's maximum width and its side gutter, 16 px on phones growing to 32 px on wide screens.
  pageWidth: 1200,
  pageGutterMin: 16,
  pageGutterMax: 32,
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
    // Body text renders at fontSizeSM under the compact algorithm, so it shares the small line height.
    lineHeight: style.lineHeightSM / style.fontSizeSM,
    lineHeightSM: style.lineHeightSM / style.fontSizeSM,
    lineHeightLG: style.lineHeightLG / style.fontSizeLG,
    lineHeightHeading1: style.lineHeightHeading1 / style.fontSizeHeading1,
    lineHeightHeading2: style.lineHeightHeading2 / style.fontSizeHeading2,
    lineHeightHeading3: style.lineHeightHeading3 / style.fontSizeHeading3,
    lineHeightHeading4: style.lineHeightHeading4 / style.fontSizeHeading4,
    lineHeightHeading5: style.lineHeightLG / style.fontSizeHeading5,
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
      contentLineHeight: style.lineHeightBase / style.fontSize,
      contentLineHeightLG: style.lineHeightBase / style.fontSize,
      contentLineHeightSM: style.lineHeightSM / style.fontSizeSM,
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

// Card titles (fontSizeLG) and button labels (16 px) set their own font size but inherit the body line
// height, and no theme token reaches them; ConfigProvider gives them their lines on the scale.
export const cardConfig: ConfigProviderProps['card'] = {
  styles: { header: { lineHeight: style.lineHeightLG / style.fontSizeLG } },
}
export const buttonConfig: ConfigProviderProps['button'] = {
  styles: { root: { lineHeight: style.lineHeightBase / style.fontSize } },
}

// Clerk's sign-in card takes the same values, so it reads as part of the site. Clerk has no line-height
// variable, so its text is put on the scale element by element.
const px = (value: number) => `${value}px`
const clerkText = { fontSize: px(style.fontSizeSM), lineHeight: px(style.lineHeightSM) }
export const clerkAppearance = {
  variables: {
    colorPrimary: style.button,
    colorForeground: style.text,
    colorMutedForeground: style.textSecondary,
    colorBackground: style.cardBg,
    fontFamily: style.fontFamily,
    fontSize: `${style.fontSize}px`,
    borderRadius: `${style.radius}px`,
  },
  elements: {
    cardBox: { borderRadius: `${style.cardRadius}px`, boxShadow: style.noShadow },
    headerTitle: { fontSize: px(style.fontSizeLG), lineHeight: px(style.lineHeightLG) },
    headerSubtitle: clerkText,
    formFieldLabel: clerkText,
    formFieldInput: { borderRadius: `${style.pillRadius}px`, fontSize: px(style.fontSize), lineHeight: px(style.lineHeightBase) },
    formButtonPrimary: {
      borderRadius: `${style.pillRadius}px`,
      fontWeight: style.fontWeightButton,
      boxShadow: style.noShadow,
      fontSize: px(style.fontSize),
      lineHeight: px(style.lineHeightBase),
    },
    footerActionText: clerkText,
    footerActionLink: clerkText,
  },
}
