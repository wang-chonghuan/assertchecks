import { Flex, Typography, theme } from 'antd'

// A copyable block of code or a command. Ant has only inline code, so this composes Typography with
// a scrolling <pre>; long lines scroll inside the block instead of widening the page.
export function CodeBlock({ code, label }: { code: string; label: string }) {
  const { token } = theme.useToken()
  return (
    <div
      style={{
        minWidth: 0,
        borderRadius: token.borderRadiusLG,
        background: token.colorBgSpotlight,
        border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
        overflow: 'hidden',
      }}
    >
      <Flex
        justify="space-between"
        align="center"
        style={{ paddingInline: token.padding, paddingBlock: token.paddingXXS, borderBottom: `${token.lineWidth}px ${token.lineType} color-mix(in srgb, ${token.colorTextLightSolid} 12%, transparent)` }}
      >
        <Typography.Text style={{ color: token.colorTextLightSolid, opacity: 0.65, fontSize: token.fontSizeSM }}>{label}</Typography.Text>
        <Typography.Text copyable={{ text: code, tooltips: ['Copy', 'Copied'] }} aria-label={`Copy ${label}`} />
      </Flex>
      <pre
        style={{
          margin: 0,
          padding: token.padding,
          overflowX: 'auto',
          color: token.colorTextLightSolid,
          fontFamily: token.fontFamilyCode,
          fontSize: token.fontSizeSM,
          lineHeight: token.lineHeightLG,
        }}
      >
        {code}
      </pre>
    </div>
  )
}
