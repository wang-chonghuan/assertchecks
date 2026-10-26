// The only place custom UI values are declared (charter/ui.md): src/infui is where every app keeps its
// tokens. Colours follow the adsy.com palette
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
  fontFamilyCode: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace",
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
  fontWeightBody: 400,
  fontWeightLabel: 600,
  fontWeightWordmark: 700,
  letterSpacingWordmark: '-0.02em',
  fontWeightDisplay: 400, // the hero headline
  fontWeightButton: 600,
  // The control height before the compact algorithm, which turns it into 32 px. Button needs it again
  // because its own algorithm would otherwise compact the already-compact height a second time.
  controlHeightSeed: 36,
  pillRadius: 999,
  // Page frame, shared by every page and section through src/infui/page-frame.ts: the content
  // column's maximum width and its side gutter, 16 px on phones growing to 32 px on wide screens.
  pageWidth: 1200,
  pageGutterMin: 16,
  pageGutterMax: 32,
  // Spacing, named by what it separates, every value a multiple of 4. Pages and components take margins,
  // paddings and gaps only from `space` below (`pnpm check:infui`); Ant's own margin and padding tokens,
  // collapsed by the compact algorithm (margin and marginSM are both 8 px), stay inside Ant's components.
  spaceInline: 4, // an icon or dot and its label
  spaceStack: 8, // lines of one block: a title and its description, tags in a row, buttons in a row
  spaceGroup: 16, // items of one group: cards beside or below each other, rows of a list
  spaceBlock: 24, // blocks of one section: a section title and its content
  spaceSection: 48, // sections of a page
  // Fixed sizes of drawn things that are not text or controls.
  dotSize: 8, // legend dots
  barsHeight: 48, // the 30-day failure bars
  barMinHeight: 4, // a day with failures is never invisible
  barGap: 2,
  summaryBarHeight: 8, // the passed/failed bar on a check card
  listIndent: '1.25em', // numbered Given/When/Then lists
  heroDotGrid: 16, // the homepage hero's dotted background
  heroTextWidth: 560, // the homepage hero's lead paragraph
} as const

const style = ASSERTCHECKS_STYLE

export const space = {
  inline: style.spaceInline,
  stack: style.spaceStack,
  group: style.spaceGroup,
  block: style.spaceBlock,
  section: style.spaceSection,
} as const

// Text styles. Every piece of text takes exactly one, by what it is; each fixes the family, size, line
// height (px, a multiple of 4), weight and colour. Ten at most, as in Material's and Apple's type scales:
// a few headings, the reading text, and the small roles around it.
const textStyle = (fontSize: number, lineHeight: number, fontWeight: number, color: string) =>
  ({ fontFamily: style.fontFamily, fontSize, lineHeight: `${lineHeight}px`, fontWeight, color }) as const
export const text = {
  // The homepage headline only: grows with the window from Heading 2 to Heading 1.
  display: {
    fontFamily: style.fontFamily,
    fontSize: `clamp(${style.fontSizeHeading2}px, 5.3vw, ${style.fontSizeHeading1}px)`,
    lineHeight: `max(${style.lineHeightHeading2}px, ${style.lineHeightHeading1 / style.fontSizeHeading1}em)`,
    fontWeight: style.fontWeightDisplay,
    color: style.text,
  },
  heading1: textStyle(style.fontSizeHeading2, style.lineHeightHeading2, style.fontWeightHeading, style.text), // section titles
  heading2: textStyle(style.fontSizeHeading4, style.lineHeightHeading4, style.fontWeightHeading, style.text), // page titles
  heading3: textStyle(style.fontSizeLG, style.lineHeightLG, style.fontWeightHeading, style.text), // card and block titles
  lead: textStyle(style.fontSizeLG, style.lineHeightLG, style.fontWeightBody, style.text), // an introduction under a headline
  body: textStyle(style.fontSizeSM, style.lineHeightSM, style.fontWeightBody, style.text), // reading text and descriptions
  label: textStyle(style.fontSizeSM, style.lineHeightSM, style.fontWeightLabel, style.text), // a name, a count or the selected item
  caption: textStyle(style.fontSizeSM, style.lineHeightSM, style.fontWeightBody, style.textSecondary), // times, authors, hints, empty values
  code: { ...textStyle(style.fontSizeSM, style.lineHeightSM, style.fontWeightBody, style.text), fontFamily: style.fontFamilyCode }, // IDs, commits, commands
  eyebrow: { ...textStyle(style.fontSizeSM, style.lineHeightSM, style.fontWeightLabel, style.primary), textTransform: 'uppercase', letterSpacing: '0.08em' }, // the kicker above a section title
} as const
// Line heights for drawings that lay text out themselves.
export const lines = { body: style.lineHeightSM, lead: style.lineHeightLG } as const

// The product mark at its two sizes: the wordmark, the tile and the check inside it, the tile's corner
// and the gap to the wordmark, all in proportion to the wordmark.
const mark = (fontSize: number) => {
  const tile = Math.round(fontSize * 1.3)
  return {
    fontFamily: style.fontFamily, fontSize, fontWeight: style.fontWeightWordmark, letterSpacing: style.letterSpacingWordmark,
    tile, iconSize: Math.round(tile * 0.58), tileRadius: Math.round(tile * 0.3), gap: Math.round(fontSize * 0.45),
  }
}
export const brand = { default: mark(style.fontSizeLG), large: mark(style.fontSizeHeading4) } as const
