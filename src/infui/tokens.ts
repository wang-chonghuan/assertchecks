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

// Each type size with its line height in px. A style that sets a font size spreads the whole pair, so
// text always sits on the 4 px line scale. Drawings that lay out text themselves use `lines` below.
const pair = (fontSize: number, lineHeight: number) => ({ fontSize, lineHeight: `${lineHeight}px` })
export const type = {
  small: pair(style.fontSizeSM, style.lineHeightSM),
  body: pair(style.fontSize, style.lineHeightBase),
  lead: pair(style.fontSizeLG, style.lineHeightLG),
  heading4: pair(style.fontSizeHeading4, style.lineHeightHeading4),
  heading3: pair(style.fontSizeHeading3, style.lineHeightHeading3),
  heading2: pair(style.fontSizeHeading2, style.lineHeightHeading2),
  heading1: pair(style.fontSizeHeading1, style.lineHeightHeading1),
} as const
export const lines = { small: style.lineHeightSM, body: style.lineHeightBase, lead: style.lineHeightLG } as const

// The product mark at its two sizes: the wordmark, the tile and the check inside it, the tile's corner
// and the gap to the wordmark, all in proportion to the wordmark.
const mark = (fontSize: number) => {
  const tile = Math.round(fontSize * 1.3)
  return { fontSize, tile, iconSize: Math.round(tile * 0.58), tileRadius: Math.round(tile * 0.3), gap: Math.round(fontSize * 0.45) }
}
export const brand = { default: mark(style.fontSizeLG), large: mark(style.fontSizeHeading4) } as const

// The homepage headline grows with the window from Heading 2 to Heading 1; its line never gets tighter
// than Heading 2's as it shrinks.
export const heroTitle = {
  fontSize: `clamp(${style.fontSizeHeading2}px, 5.3vw, ${style.fontSizeHeading1}px)`,
  lineHeight: `max(${style.lineHeightHeading2}px, ${style.lineHeightHeading1 / style.fontSizeHeading1}em)`,
} as const
