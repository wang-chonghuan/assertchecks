// Bugs and their tickets (ASSERT-37). A person asks three things about a bug: does it need a ticket, is a
// ticket on it, is it fixed. These pieces answer only that.
import { Form, Input, Modal, Tag, Tooltip, Typography } from 'antd'
import { ExportOutlined } from '@ant-design/icons'
import { useEffect, useState, type ReactNode } from 'react'
import type { BugStatus, CaseBug } from '../lib/types'
import { text } from '../infui/tokens'

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

const STATUS: Record<BugStatus, { color: string; label: string }> = {
  'needs-ticket': { color: 'error', label: 'Needs a ticket' },
  'in-progress': { color: 'processing', label: 'In progress' },
  fixed: { color: 'success', label: 'Fixed' },
}

export function BugStatusTag({ status }: { status: BugStatus }) {
  return <Tag color={STATUS[status].color}>{STATUS[status].label}</Tag>
}

// A ticket's short name: its issue key (ENG-1702) when the link has one, a GitHub repo#number, else the
// tracker's name. Plane links carry no key, only an ID that says nothing to a reader.
const TRACKERS: [RegExp, string][] = [[/(^|\.)plane\.so$/, 'Plane'], [/(^|\.)linear\.app$/, 'Linear'], [/\.atlassian\.net$/, 'Jira']]
export function ticketLabel(url: string): string {
  const key = url.match(/\b[A-Z][A-Z0-9]+-\d+(?![-\w])/)
  if (key) return key[0]
  let host = url
  try { host = new URL(url).hostname } catch { return url }
  const github = url.match(/github\.com\/[^/]+\/([^/]+)\/(?:issues|pull)\/(\d+)/)
  if (github) return `${github[1]}#${github[2]}`
  const tracker = TRACKERS.find(([pattern]) => pattern.test(host))
  return `${tracker ? tracker[1] : host.replace(/^www\./, '')} ticket`
}

// Who attached a ticket, short: an email's name part, or the client's own label.
export const attachedBy = (by: string) => (by.includes('@') ? by.split('@')[0] : by)

// A ticket's link: its short name, the full link on hover. It opens the ticket and never the row it sits in.
export function TicketUrl({ url }: { url: string }) {
  return (
    <Tooltip title={url}>
      <Typography.Link href={url} target="_blank" onClick={(event) => event.stopPropagation()}>
        {ticketLabel(url)} <ExportOutlined />
      </Typography.Link>
    </Tooltip>
  )
}

// Paste one Linear or Plane link for the cases or problem named in `subject`.
export function AttachTicketModal({ open, subject, onCancel, onSave }: {
  open: boolean
  subject: ReactNode
  onCancel: () => void
  onSave: (url: string) => Promise<void>
}) {
  const [form] = Form.useForm<{ url: string }>()
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (open) form.setFieldsValue({ url: '' }) }, [open, form])
  return (
    <Modal
      open={open}
      title="Attach a ticket"
      okText="Attach"
      confirmLoading={saving}
      onCancel={onCancel}
      onOk={async () => {
        const { url } = await form.validateFields()
        setSaving(true)
        try { await onSave(url.trim()) } finally { setSaving(false) }
      }}
      destroyOnHidden
    >
      <Typography.Paragraph style={text.body} ellipsis={{ rows: 2 }}>{subject}</Typography.Paragraph>
      <Form form={form} layout="vertical">
        <Form.Item
          name="url"
          label="Linear or Plane ticket link"
          rules={[{ required: true, type: 'url', message: 'Paste the Linear or Plane ticket link.' }, { max: 256 }]}
        >
          <Input placeholder="https://linear.app/… or https://app.plane.so/…" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// One bug's ticket in a line: the newest ticket, or the one whose fix did not hold.
export function BugTicketLine({ bug }: { bug: CaseBug }) {
  if (bug.previous) {
    return <Typography.Text style={text.caption}>Failed again after <TicketUrl url={bug.previous} /></Typography.Text>
  }
  const newest = bug.tickets[0]
  if (!newest) return null
  return (
    <Typography.Text style={text.caption}>
      <TicketUrl url={newest.url} />
      {bug.tickets.length > 1 ? ` and ${plural(bug.tickets.length - 1, 'earlier ticket')}` : ''}
    </Typography.Text>
  )
}
