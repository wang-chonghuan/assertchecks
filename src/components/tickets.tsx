// Tickets on cases and problems (ASSERT-37): the attach dialog, a ticket's link and state, and the
// project's tickets grouped by ticket.
import { Link } from '@tanstack/react-router'
import { Alert, Card, Collapse, Divider, Flex, Form, Input, Modal, Skeleton, Tag, Typography, theme } from 'antd'
import { ExportOutlined } from '@ant-design/icons'
import { useEffect, useState, type ReactNode } from 'react'
import { getProjectTickets } from '../server/fns'
import type { ProjectTicket, ProjectTickets, TicketState } from '../lib/types'
import { utc } from './status'

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

// What later runs say about a ticket, in the words a person checks a fix by. The compact form is for
// lists that repeat it per case and environment.
export function TicketStateTag({ state, failed, runs, compact = false }: { state: TicketState; failed: number; runs: number; compact?: boolean }) {
  if (state === 'verified') return <Tag color="success">{compact ? 'Verified fixed' : 'Verified fixed: passed 2 runs in a row'}</Tag>
  if (state === 'passing') return <Tag color="processing">{compact ? 'Passed once' : 'Passed once since the ticket'}</Tag>
  if (state === 'failing') {
    return <Tag color="error">{compact ? `Still failing ${failed}/${runs}` : `Still failing: ${failed} of ${plural(runs, 'run')} since the ticket`}</Tag>
  }
  return <Tag>{compact ? 'No run yet' : 'No run since the ticket'}</Tag>
}

// A ticket's short name: its issue key (ENG-1702) when the link has one, else the link's last part.
export function ticketLabel(url: string): string {
  const key = url.match(/\b[A-Z][A-Z0-9]+-\d+(?![-\w])/)
  if (key) return key[0]
  const path = url.replace(/[?#].*$/, '').split('/').filter(Boolean)
  const last = path.at(-1) ?? url
  // An opaque ID (a UUID) says nothing; show its start.
  return /^[0-9a-f-]{20,}$/i.test(last) ? `${last.slice(0, 8)}…` : last
}

// Who attached a ticket, short: an email's name part, or the client's own label.
export const attachedBy = (by: string) => (by.includes('@') ? by.split('@')[0] : by)

// A ticket's link opens the ticket and never the row it sits in; `short` shows only its key.
export function TicketUrl({ url, short = false }: { url: string; short?: boolean }) {
  return (
    <Typography.Link href={url} target="_blank" title={url} onClick={(event) => event.stopPropagation()} style={short ? undefined : { wordBreak: 'break-all' }}>
      {short ? ticketLabel(url) : url} <ExportOutlined />
    </Typography.Link>
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
      <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }}>{subject}</Typography.Paragraph>
      <Form form={form} layout="vertical">
        <Form.Item
          name="url"
          label="Linear or Plane ticket link"
          extra="Earlier tickets stay; this one becomes the newest."
          rules={[{ required: true, type: 'url', message: 'Paste the Linear or Plane ticket link.' }, { max: 256 }]}
        >
          <Input placeholder="https://linear.app/… or https://app.plane.so/…" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// Each ticket with its cases stacked below it, so phones read it without scrolling sideways.
function TicketList({ tickets, project, empty }: { tickets: ProjectTicket[]; project: string; empty: string }) {
  const { token } = theme.useToken()
  if (!tickets.length) return <Typography.Text type="secondary">{empty}</Typography.Text>
  return (
    <Flex vertical>
      {tickets.map((ticket, index) => (
        <Flex key={ticket.url} vertical gap={token.marginXS}>
          {index > 0 && <Divider style={{ margin: 0 }} />}
          <Flex gap="small" wrap align="baseline">
            <TicketUrl url={ticket.url} short />
            <Typography.Text type="secondary">by {attachedBy(ticket.by)}, {utc(ticket.firstAt)}</Typography.Text>
          </Flex>
          {ticket.cases.map((item) => (
            <Flex key={item.case} vertical align="flex-start">
              <Flex gap="small" wrap align="baseline">
                {item.checks[0]
                  ? <Link to="/p/$project/checks/$check/cases/$case" params={{ project, check: item.checks[0].slug, case: item.case }}>{item.case}</Link>
                  : <Typography.Text>{item.case}</Typography.Text>}
                <Typography.Text type="secondary">{item.title}</Typography.Text>
              </Flex>
              {item.checks.length === 0
                ? <Typography.Text type="secondary">No check has run it</Typography.Text>
                : (
                  <Flex gap="small" wrap>
                    {item.checks.map((check) => (
                      <Flex key={check.slug} gap={token.marginXXS} align="center">
                        <Typography.Text type="secondary">{check.name}</Typography.Text>
                        <TicketStateTag state={check.state} failed={check.failed} runs={check.runs} compact />
                      </Flex>
                    ))}
                  </Flex>
                )}
            </Flex>
          ))}
        </Flex>
      ))}
    </Flex>
  )
}

// The project's tickets on cases, grouped by ticket: open first, verified ones folded below.
export function ProjectTicketsCard({ project }: { project: string }) {
  const [data, setData] = useState<ProjectTickets | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  useEffect(() => {
    getProjectTickets({ data: { project } }).then(setData, (error: Error) => setFailed(error.message))
  }, [project])
  if (failed) return <Alert type="error" showIcon title="Tickets could not be loaded" description={failed} />
  if (!data) return <Card title="Tickets"><Skeleton active /></Card>
  if (data.tickets.length === 0 && data.untracked.length === 0) return null
  const open = data.tickets.filter((ticket) => ticket.section === 'open')
  const recent = data.tickets.filter((ticket) => ticket.section === 'recent')
  const earlier = data.tickets.filter((ticket) => ticket.section === 'earlier')
  return (
    <Card title={`Tickets (${open.length} open)`}>
      <Flex vertical gap="middle">
        {data.untracked.length > 0 && (
          <Alert
            type="warning"
            showIcon
            title={`${plural(data.untracked.length, 'failing case')} without a ticket`}
            description={(
              <Flex gap="small" wrap>
                {data.untracked.map((item) => (
                  <Link key={item.case} to="/p/$project/checks/$check/cases/$case" params={{ project, check: item.checks[0].slug, case: item.case }} title={item.title}>
                    {item.case}
                  </Link>
                ))}
              </Flex>
            )}
          />
        )}
        <TicketList tickets={open} project={project} empty="No open ticket." />
        {(recent.length > 0 || earlier.length > 0) && (
          <Collapse
            ghost
            items={[
              ...(recent.length ? [{ key: 'recent', label: `Verified in the last 14 days (${recent.length})`, children: <TicketList tickets={recent} project={project} empty="" /> }] : []),
              ...(earlier.length ? [{ key: 'earlier', label: `Verified earlier (${earlier.length})`, children: <TicketList tickets={earlier} project={project} empty="" /> }] : []),
            ].map((item) => ({ ...item, styles: { header: { paddingInline: 0 }, body: { paddingInline: 0 } } }))}
          />
        )}
      </Flex>
    </Card>
  )
}
