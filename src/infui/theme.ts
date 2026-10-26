import { theme as antdTheme, type ConfigProviderProps, type ThemeConfig } from 'antd'
import { ASSERTCHECKS_STYLE } from './tokens'

// The Ant theme, ConfigProvider settings and Clerk appearance, built only from the token table.

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
    fontFamilyCode: style.fontFamilyCode,
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
    // The field is a pill; its dropdown panel takes borderRadiusLG, so that one stays the card radius.
    Select: { borderRadius: style.pillRadius, borderRadiusLG: style.cardRadius, borderRadiusSM: style.pillRadius },
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
    socialButtonsBlockButton: { borderRadius: `${style.pillRadius}px`, boxShadow: style.noShadow },
    socialButtonsBlockButtonText: { fontSize: px(style.fontSize), lineHeight: px(style.lineHeightBase), fontWeight: style.fontWeightButton },
    footerActionText: clerkText,
    footerActionLink: clerkText,
  },
}
