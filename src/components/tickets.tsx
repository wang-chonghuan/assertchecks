// Bugs and their tickets (ASSERT-37). A person asks three things about a bug: does it need a ticket, is a
// ticket on it, is it fixed. These pieces answer only that.
import { Link } from '@tanstack/react-router'
import { Alert, Card, Collapse, Flex, Form, Input, Modal, Skeleton, Table, Tag, Typography, theme } from 'antd'
import type { TableColumnsType } from 'antd'
import { ExportOutlined } from '@ant-design/icons'
import { useEffect, useState, type ReactNode } from 'react'
import { getProjectBugs } from '../server/fns'
import type { Bug, BugStatus, CaseBug, ProjectBugs } from '../lib/types'
import { space, text } from '../infui/tokens'

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

const STATUS: Record<BugStatus, { color: string; label: string }> = {
  'needs-ticket': { color: 'error', label: 'Needs a ticket' },
  'in-progress': { color: 'processing', label: 'In progress' },
  fixed: { color: 'success', label: 'Fixed' },
}

export function BugStatusTag({ status }: { status: BugStatus }) {
  return <Tag color={STATUS[status].color}>{STATUS[status].label}</Tag>
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
    return <Typography.Text style={text.caption}>Failed again after <TicketUrl url={bug.previous} short /></Typography.Text>
  }
  const newest = bug.tickets[0]
  if (!newest) return null
  return (
    <Typography.Text style={text.caption}>
      <TicketUrl url={newest.url} short />
      {bug.tickets.length > 1 ? ` and ${plural(bug.tickets.length - 1, 'earlier ticket')}` : ''}
    </Typography.Text>
  )
}

// The bugs as a table like every other list on the site, so rows take the theme's padding and hover.
function BugList({ bugs, project }: { bugs: Bug[]; project: string }) {
  const { token } = theme.useToken()
  const columns: TableColumnsType<Bug> = [
    {
      title: 'Status',
      key: 'status',
      width: token.controlHeight * 4,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_, bug) => <BugStatusTag status={bug.status} />,
    },
    {
      title: 'Bug',
      key: 'bug',
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_, bug) => (
        <Flex vertical>
          <Typography.Text>
            <Link to="/p/$project/checks/$check/cases/$case" params={{ project, check: bug.check, case: bug.case }}>{bug.case}</Link>
            {' '}{bug.title}
          </Typography.Text>
          <BugTicketLine bug={bug} />
        </Flex>
      ),
    },
  ]
  return <Table rowKey="case" size="middle" pagination={false} tableLayout="fixed" showHeader={false} columns={columns} dataSource={bugs} />
}

// The project's bugs: those needing a ticket first, then those in progress; fixed ones folded.
export function ProjectBugsCard({ project }: { project: string }) {
  const [data, setData] = useState<ProjectBugs | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  useEffect(() => {
    getProjectBugs({ data: { project } }).then(setData, (error: Error) => setFailed(error.message))
  }, [project])
  if (failed) return <Alert type="error" showIcon title="Bugs could not be loaded" description={failed} />
  if (!data) return <Card title="Bugs"><Skeleton active /></Card>
  if (data.bugs.length === 0) return null
  const open = data.bugs.filter((bug) => bug.status !== 'fixed')
  const fixed = data.bugs.filter((bug) => bug.status === 'fixed')
  const needing = open.filter((bug) => bug.status === 'needs-ticket').length
  return (
    <Card
      title="Bugs"
      extra={<Typography.Text style={text.caption}>{needing} need a ticket · {open.length - needing} in progress</Typography.Text>}
    >
      <Flex vertical gap={space.group}>
        {open.length ? <BugList bugs={open} project={project} /> : <Typography.Text style={text.caption}>No open bug.</Typography.Text>}
        {fixed.length > 0 && (
          <Collapse
            ghost
            items={[{
              key: 'fixed',
              label: `Fixed in the last two weeks (${fixed.length})`,
              children: <BugList bugs={fixed} project={project} />,
              styles: { header: { paddingInline: 0 }, body: { paddingInline: 0 } },
            }]}
          />
        )}
      </Flex>
    </Card>
  )
}
