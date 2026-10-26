import { CheckOutlined } from '@ant-design/icons'
import { theme } from 'antd'
import { ASSERTCHECKS_STYLE, brand } from '../infui/tokens'

export const PRODUCT_NAME = 'AssertChecks'

// The product mark: a brand-coloured tile with a check, then the wordmark with "Assert" in the brand
// colour. `large` is for the sign-in card; headers and the footer use the default.
export function Brand({ size = 'default' }: { size?: 'default' | 'large' }) {
  const { token } = theme.useToken()
  const mark = brand[size]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: mark.gap,
        whiteSpace: 'nowrap',
        fontSize: mark.fontSize,
        fontWeight: mark.fontWeight,
        letterSpacing: mark.letterSpacing,
        lineHeight: ASSERTCHECKS_STYLE.lineHeightSingle,
        color: token.colorText,
      }}
    >
      <span
        aria-hidden
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: mark.tile,
          height: mark.tile,
          borderRadius: mark.tileRadius,
          background: token.colorPrimary,
          color: token.colorTextLightSolid,
          fontSize: mark.iconSize,
          boxShadow: token.boxShadowTertiary,
        }}
      >
        <CheckOutlined />
      </span>
      <span>
        <span style={{ color: token.colorPrimary }}>Assert</span>Checks
      </span>
    </span>
  )
}
