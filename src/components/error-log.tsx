import { App, Button, Tooltip } from 'antd'
import { CopyOutlined } from '@ant-design/icons'
import { space, text } from '../infui/tokens'

// A test's or a request's error output in the code style, with a copy button at its top right. No box
// of its own: it sits in an expanded row or a card, and a box there would be a card inside a card.
export function ErrorLog({ log }: { log: string }) {
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
    <div style={{ position: 'relative' }}>
      <Tooltip title="Copy">
        <Button
          size="small"
          type="text"
          icon={<CopyOutlined />}
          aria-label="Copy the error"
          onClick={(event) => { event.stopPropagation(); void copy() }}
          style={{ position: 'absolute', top: 0, insetInlineEnd: 0 }}
        />
      </Tooltip>
      {/* Room on the right so the first line never runs under the button. */}
      <pre style={{ ...text.code, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, paddingInlineEnd: space.section }}>{log.trim()}</pre>
    </div>
  )
}
