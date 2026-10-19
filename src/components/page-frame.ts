import type { CSSProperties } from 'react'
import { ASSERTCHECKS_STYLE } from '../theme'

const { pageWidth, pageGutterMin, pageGutterMax } = ASSERTCHECKS_STYLE

// The side gutter every page and section uses, so content lines up from the header to the footer.
export const pageGutter = `clamp(${pageGutterMin}px, 4vw, ${pageGutterMax}px)`

// The centred content column: header bars, sections, the app content and the footer all use it.
export const pageFrame: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  maxWidth: pageWidth,
  marginInline: 'auto',
  paddingInline: pageGutter,
}
