import { App, Button, Tooltip, theme } from 'antd'
import { CopyOutlined } from '@ant-design/icons'
import { space, text } from '../infui/tokens'

// A test's or a request's error output as a code block, with a copy button in its corner.
export function ErrorLog({ log }: { log: string }) {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(log.trim())
      message.success('Error copied.')
    } catch {
      message.error('Copying failed. Allow clipboard access for this page and try again.')
    }
  }
  return (
    <div style={{ position: 'relative', background: token.colorFillQuaternary, borderRadius: token.borderRadiusLG, padding: space.group }}>
      <Tooltip title="Copy">
        <Button
          size="small"
          type="text"
          icon={<CopyOutlined />}
          aria-label="Copy the error"
          onClick={(event) => { event.stopPropagation(); void copy() }}
          style={{ position: 'absolute', top: space.stack, insetInlineEnd: space.stack }}
        />
      </Tooltip>
      {/* Room on the right so the first line never runs under the button. */}
      <pre style={{ ...text.code, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, paddingInlineEnd: space.block }}>{log.trim()}</pre>
    </div>
  )
}
