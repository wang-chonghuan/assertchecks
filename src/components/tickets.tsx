// Tickets on cases and problems (ASSERT-37): the attach dialog, a ticket's link and state, and the
// project's tickets grouped by ticket.
import { Link } from '@tanstack/react-router'
import { Alert, Card, Collapse, Empty, Flex, Form, Input, Modal, Skeleton, Table, Tag, Typography, theme } from 'antd'
import type { TableColumnsType } from 'antd'
import { ExportOutlined } from '@ant-design/icons'
import { useEffect, useState, type ReactNode } from 'react'
import { getProjectTickets } from '../server/fns'
import type { ProjectTicket, ProjectTickets, TicketState } from '../lib/types'
import { utc } from './status'

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

// What later runs say about a ticket, in the words a person checks a fix by.
export function TicketStateTag({ state, failed, runs }: { state: TicketState; failed: number; runs: number }) {
  if (state === 'verified') return <Tag color="success">Verified fixed: passed 2 runs in a row</Tag>
  if (state === 'passing') return <Tag color="processing">Passed once since the ticket</Tag>
  if (state === 'failing') return <Tag color="error">Still failing: {failed} of {plural(runs, 'run')} since the ticket</Tag>
  return <Tag>No run since the ticket</Tag>
}

// A ticket's link opens the ticket and never the row it sits in.
export function TicketUrl({ url }: { url: string }) {
  return (
    <Typography.Link href={url} target="_blank" onClick={(event) => event.stopPropagation()} style={{ wordBreak: 'break-all' }}>
      {url} <ExportOutlined />
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

function TicketTable({ tickets, project }: { tickets: ProjectTicket[]; project: string }) {
  const { token } = theme.useToken()
  const columns: TableColumnsType<ProjectTicket> = [
    {
      title: 'Ticket',
      key: 'ticket',
      width: token.controlHeight * 10,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_, ticket) => (
        <Flex vertical>
          <TicketUrl url={ticket.url} />
          <Typography.Text type="secondary">by {ticket.by}, {utc(ticket.firstAt)}</Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Cases',
      key: 'cases',
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_, ticket) => (
        <Flex vertical gap={token.marginXS}>
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
                        <TicketStateTag state={check.state} failed={check.failed} runs={check.runs} />
                      </Flex>
                    ))}
                  </Flex>
                )}
            </Flex>
          ))}
        </Flex>
      ),
    },
  ]
  return (
    <Table
      rowKey="url"
      size="middle"
      pagination={false}
      tableLayout="fixed"
      scroll={{ x: token.controlHeight * 20 }}
      columns={columns}
      dataSource={tickets}
      locale={{ emptyText: <Empty description="No open ticket." /> }}
    />
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
  if (data.tickets.length === 0) return null
  const open = data.tickets.filter((ticket) => ticket.section === 'open')
  const recent = data.tickets.filter((ticket) => ticket.section === 'recent')
  const earlier = data.tickets.filter((ticket) => ticket.section === 'earlier')
  return (
    <Card title={`Tickets (${open.length} open)`}>
      <Flex vertical gap="middle">
        <TicketTable tickets={open} project={project} />
        {(recent.length > 0 || earlier.length > 0) && (
          <Collapse
            ghost
            items={[
              ...(recent.length ? [{ key: 'recent', label: `Verified in the last 14 days (${recent.length})`, children: <TicketTable tickets={recent} project={project} /> }] : []),
              ...(earlier.length ? [{ key: 'earlier', label: `Verified earlier (${earlier.length})`, children: <TicketTable tickets={earlier} project={project} /> }] : []),
            ].map((item) => ({ ...item, styles: { header: { paddingInline: 0 }, body: { paddingInline: 0 } } }))}
          />
        )}
      </Flex>
    </Card>
  )
}
