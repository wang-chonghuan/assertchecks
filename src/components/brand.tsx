import { theme } from 'antd'

export const PRODUCT_NAME = 'AssertChecks'

// "Assert" carries the brand colour; the rest inherits the surrounding text style.
export function Brand() {
  const { token } = theme.useToken()
  return (
    <span style={{ whiteSpace: 'nowrap' }}>
      <span style={{ color: token.colorPrimary }}>Assert</span>Checks
    </span>
  )
}
