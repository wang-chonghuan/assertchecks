import { CheckOutlined } from '@ant-design/icons'
import { theme } from 'antd'

export const PRODUCT_NAME = 'AssertChecks'

// The product mark: a brand-coloured tile with a check, then the wordmark with "Assert" in the brand
// colour. `large` is for the sign-in card; headers and the footer use the default.
export function Brand({ size = 'default' }: { size?: 'default' | 'large' }) {
  const { token } = theme.useToken()
  const font = Number(size === 'large' ? token.fontSizeHeading2 : token.fontSizeHeading4)
  const tile = Math.round(font * 1.3)
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: Math.round(font * 0.45),
        whiteSpace: 'nowrap',
        fontSize: font,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        lineHeight: 1,
        color: token.colorText,
      }}
    >
      <span
        aria-hidden
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: tile,
          height: tile,
          borderRadius: Math.round(tile * 0.3),
          background: token.colorPrimary,
          color: token.colorTextLightSolid,
          fontSize: Math.round(tile * 0.58),
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
