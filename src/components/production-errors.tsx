import { Alert, App, Button, Card, Collapse, Descriptions, Empty, Flex, Form, Input, Modal, Popconfirm, Skeleton, Table, Tag, Tooltip, Typography, theme } from 'antd'
import type { TableColumnsType } from 'antd'
import { ExportOutlined } from '@ant-design/icons'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { decideProblem, getProductionErrors } from '../server/fns'
import type { NoiseCategory, ProblemGroup, ProblemView, ProductionErrors } from '../lib/types'
import { utc } from './status'

const NOISE_LABEL: Record<NoiseCategory, string> = {
  client: '4xx responses',
  scanner: 'Scanner probes',
  aborted: 'Requests the client aborted',
  analytics: 'Blocked analytics calls',
  script: 'Cross-origin "Script error."',
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`
const unit = (problem: ProblemView) => (problem.kind === 'slow' ? 'slow hour' : 'failure')

// The last 30 days of failures that need handling, one bar a day.
function DailyBars({ daily }: { daily: ProductionErrors['daily'] }) {
  const { token } = theme.useToken()
  const max = Math.max(1, ...daily.map((day) => day.count))
  return (
    <Flex vertical gap={token.marginXXS}>
      <Flex align="end" gap={token.marginXXS / 2} style={{ height: token.sizeXXL }} role="img" aria-label="Failures per day, last 30 days">
        {daily.map((day) => (
          <Tooltip key={day.day} title={`${day.day} · ${plural(day.count, 'failure')}`}>
            <div
              style={{
                flex: 1,
                height: `${(day.count / max) * 100}%`,
                // A day with failures always shows; a quiet day is a thin baseline.
                minHeight: day.count ? token.marginXXS : token.lineWidthBold,
                background: day.count ? token.colorError : token.colorFillSecondary,
                borderRadius: token.borderRadiusXS,
              }}
            />
          </Tooltip>
        ))}
      </Flex>
      <Flex justify="space-between">
        <Typography.Text type="secondary">{daily[0]?.day}</Typography.Text>
        <Typography.Text type="secondary">{daily.at(-1)?.day}</Typography.Text>
      </Flex>
    </Flex>
  )
}

type Asking = { problem: ProblemView; decision: 'ticket' | 'ignored' }

function DecisionModal({ asking, onCancel, onSave }: {
  asking: Asking | null
  onCancel: () => void
  onSave: (value: string) => Promise<void>
}) {
  const [form] = Form.useForm<{ value: string }>()
  const [saving, setSaving] = useState(false)
  const ticket = asking?.decision === 'ticket'
  useEffect(() => {
    form.setFieldsValue({ value: ticket && asking.problem.decision?.kind === 'ticket' ? asking.problem.decision.url : '' })
  }, [asking, form, ticket])
  return (
    <Modal
      open={asking !== null}
      title={ticket ? 'Attach a ticket' : 'Not handling'}
      okText={ticket ? 'Attach' : 'Mark not handling'}
      confirmLoading={saving}
      onCancel={onCancel}
      onOk={async () => {
        const { value } = await form.validateFields()
        setSaving(true)
        try { await onSave(value.trim()) } finally { setSaving(false) }
      }}
      destroyOnHidden
    >
      <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }}>{asking?.problem.key}</Typography.Paragraph>
      <Form form={form} layout="vertical">
        <Form.Item
          name="value"
          label={ticket ? 'Ticket URL' : 'Why it is not handled'}
          rules={ticket
            ? [{ required: true, type: 'url', message: 'Paste the ticket link (http or https).' }, { max: 256 }]
            : [{ required: true, whitespace: true, message: 'Say in one line why.' }, { max: 256 }]}
        >
          <Input placeholder={ticket ? 'https://linear.app/…' : 'e.g. browser extension, users are not affected'} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

function ProblemDetail({ problem }: { problem: ProblemView }) {
  const { token } = theme.useToken()
  return (
    <Flex vertical gap="small">
      <Descriptions
        size="small"
        column={{ xs: 1, sm: 1, md: 2, lg: 3, xl: 3, xxl: 3 }}
        items={[
          { key: 'first', label: 'First seen', children: utc(problem.firstSeen) },
          { key: 'last', label: 'Last seen', children: utc(problem.lastSeen) },
          { key: 'where', label: 'Where', children: problem.place ?? '—' },
          { key: 'app', label: problem.browser ? 'Source' : 'App role', children: problem.browser ? 'Browser' : (problem.role ?? '—') },
          ...(problem.slow ? [{ key: 'slow', label: 'Slowest recent hour', children: `p95 ${problem.slow.p95Ms} ms (usually ${problem.slow.usualMs} ms)` }] : []),
          ...(problem.together.length ? [{ key: 'together', label: 'Appeared together with', children: problem.together.join(' · ') }] : []),
        ]}
      />
      {problem.variants.length > 0 && (
        <Table
          size="small"
          rowKey="template"
          pagination={false}
          columns={[
            { title: 'Message', dataIndex: 'template', render: (text: string) => <Typography.Text style={{ wordBreak: 'break-word' }}>{text || '—'}</Typography.Text> },
            { title: 'Failures', dataIndex: 'count', width: token.controlHeight * 2 },
            { title: 'Last', dataIndex: 'lastAt', responsive: ['md'], render: utc },
          ]}
          dataSource={problem.variants}
        />
      )}
      {problem.latest && (
        <Flex vertical gap={token.marginXXS}>
          <Typography.Text strong>Latest failure, {utc(problem.latest.at)}</Typography.Text>
          <Typography.Text style={{ wordBreak: 'break-word' }}>{problem.latest.type ? `${problem.latest.type}: ` : ''}{problem.latest.message}</Typography.Text>
          {problem.latest.stack && (
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, maxHeight: token.controlHeight * 10, overflow: 'auto' }}>
              {problem.latest.stack}
            </pre>
          )}
        </Flex>
      )}
    </Flex>
  )
}

export function ProductionErrorsTab({ project }: { project: string }) {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const [data, setData] = useState<ProductionErrors | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [asking, setAsking] = useState<Asking | null>(null)

  const load = useCallback(async () => {
    try {
      setData(await getProductionErrors({ data: { project } }))
      setFailed(null)
    } catch (error) {
      setFailed((error as Error).message)
    }
  }, [project])
  useEffect(() => { void load() }, [load])

  const decide = async (problem: ProblemView, decision: 'ticket' | 'ignored' | 'none', value?: string) => {
    try {
      await decideProblem({
        data: { project, problem: problem.id, decision, ticketUrl: decision === 'ticket' ? value : undefined, reason: decision === 'ignored' ? value : undefined },
      })
      setAsking(null)
      await load()
    } catch (error) {
      message.error(`Saving failed: ${(error as Error).message}`)
    }
  }

  if (failed) return <Alert type="error" showIcon title="Production errors could not be loaded" description={failed} />
  if (!data) return <Card><Skeleton active /></Card>
  if (data.state === 'not-connected') {
    return (
      <Card>
        <Empty
          description={
            <Flex vertical>
              <Typography.Text strong>Not connected</Typography.Text>
              <Typography.Text type="secondary">
                This project's production telemetry is not connected, so its errors are unknown. An operator connects it with{' '}
                <Typography.Text code>pnpm admin source:set</Typography.Text>.
              </Typography.Text>
            </Flex>
          }
        />
      </Card>
    )
  }
  if (data.state === 'unavailable') {
    return (
      <Alert
        type="error"
        showIcon
        title="Production telemetry could not be read, so these errors are unknown"
        description={data.error}
        action={data.portalUrl ? <Button href={data.portalUrl} target="_blank" icon={<ExportOutlined />}>Azure</Button> : undefined}
      />
    )
  }

  const { headline } = data
  const inGroup = (group: ProblemGroup) => data.problems.filter((problem) => problem.group === group)

  const statusOf = (problem: ProblemView): ReactNode => {
    const decision = problem.decision
    if (decision?.kind === 'ticket') {
      const since = problem.sinceTicket
      return (
        <Flex vertical gap={token.marginXXS}>
          <Typography.Link href={decision.url} target="_blank" ellipsis style={{ maxWidth: token.controlHeight * 8 }}>
            {decision.url} <ExportOutlined />
          </Typography.Link>
          {since && since.count > 0
            ? <Tag color="error">Still occurring: {plural(since.count, unit(problem))} since the ticket</Tag>
            : <Tag>{since?.quietDays ? `No occurrence for ${plural(since.quietDays, 'day')} since the ticket` : 'No occurrence since the ticket'}</Tag>}
          <Typography.Text type="secondary">Ticket by {decision.by}, {utc(decision.at)}</Typography.Text>
        </Flex>
      )
    }
    if (decision?.kind === 'ignored') {
      return (
        <Flex vertical gap={token.marginXXS}>
          <Typography.Text>{decision.reason}</Typography.Text>
          <Typography.Text type="secondary">Not handling, by {decision.by}, {utc(decision.at)}</Typography.Text>
        </Flex>
      )
    }
    return null
  }

  const actionsOf = (problem: ProblemView): ReactNode => {
    const undo = (
      <Popconfirm title="Undo this decision?" onConfirm={() => decide(problem, 'none')}>
        <Button size="small">Undo</Button>
      </Popconfirm>
    )
    if (problem.decision?.kind === 'ticket') {
      return <Flex gap="small" wrap><Button size="small" onClick={() => setAsking({ problem, decision: 'ticket' })}>Change ticket</Button>{undo}</Flex>
    }
    if (problem.decision?.kind === 'ignored') return undo
    return (
      <Flex gap="small" wrap>
        <Button size="small" type="primary" onClick={() => setAsking({ problem, decision: 'ticket' })}>Attach ticket</Button>
        <Button size="small" onClick={() => setAsking({ problem, decision: 'ignored' })}>Not handling</Button>
      </Flex>
    )
  }

  const columns: TableColumnsType<ProblemView> = [
    {
      title: 'Problem',
      key: 'problem',
      render: (_, problem) => (
        <Flex vertical gap={token.marginXXS}>
          <Flex gap="small" wrap align="center">
            {problem.isNew && <Tag color="processing">New</Tag>}
            {problem.kind === 'slow' && <Tag color="warning">Slow</Tag>}
            <Typography.Text strong style={{ wordBreak: 'break-word' }}>{problem.key}</Typography.Text>
          </Flex>
          <Typography.Text type="secondary" style={{ wordBreak: 'break-word' }}>
            {problem.slow
              ? `p95 ${problem.slow.p95Ms} ms in its latest slow hour, usually ${problem.slow.usualMs} ms`
              : [problem.place, problem.browser ? 'Browser' : problem.role].filter(Boolean).join(' · ') || '—'}
          </Typography.Text>
          {problem.together.length > 0 && (
            <Tooltip title={problem.together.join(' · ')}>
              <Tag>Appeared together with {plural(problem.together.length, 'other problem')}</Tag>
            </Tooltip>
          )}
          {statusOf(problem)}
        </Flex>
      ),
    },
    {
      title: 'Failures',
      key: 'count',
      width: token.controlHeight * 6,
      render: (_, problem) => (
        <Flex vertical>
          <Typography.Text>{plural(problem.count7d, unit(problem))} in 7 days</Typography.Text>
          <Typography.Text type="secondary">{problem.count24h} in 24 h · {problem.count90d} in 90 days</Typography.Text>
        </Flex>
      ),
    },
    { title: 'Last seen', dataIndex: 'lastSeen', responsive: ['md'], width: token.controlHeight * 5, render: utc },
    { title: '', key: 'actions', width: token.controlHeight * 6, render: (_, problem) => actionsOf(problem) },
  ]

  const table = (rows: ProblemView[], empty: string) => (
    <Table
      rowKey="id"
      size="small"
      pagination={false}
      // Fixed layout lets long problem names wrap; below this width the table scrolls inside its card.
      tableLayout="fixed"
      scroll={{ x: token.controlHeight * 20 }}
      columns={columns}
      dataSource={rows}
      locale={{ emptyText: <Empty description={empty} /> }}
      expandable={{ expandedRowRender: (problem) => <ProblemDetail problem={problem} /> }}
    />
  )

  const triage = inGroup('triage')
  const ticket = inGroup('ticket')
  const quiet = inGroup('quiet')
  const ignored = inGroup('ignored')
  const noiseTotal = data.noise.reduce((total, item) => total + item.total, 0)

  return (
    <Flex vertical gap="middle">
      <Card>
        <Flex vertical gap="middle">
          <Flex vertical gap={token.marginXXS}>
            <Typography.Text strong style={{ fontSize: token.fontSizeLG, lineHeight: token.lineHeightLG }}>
              {headline.triage} to triage{headline.isNew ? ` (${headline.isNew} new)` : ''} · {headline.ticket} with a ticket
              {headline.ticket ? `, ${headline.stillOccurring} still occurring` : ''} · {plural(headline.last24h, 'failure')} in the last 24 h ({headline.previous24h} the day before)
            </Typography.Text>
            <Typography.Text type="secondary">
              Failures that need handling: one failed request or page visit counts once, noise excluded. Read {utc(data.checkedAt)}
              {data.portalUrl && <> · <Typography.Link href={data.portalUrl} target="_blank">Open in Azure <ExportOutlined /></Typography.Link></>}
            </Typography.Text>
          </Flex>
          <DailyBars daily={data.daily} />
        </Flex>
      </Card>
      <Card title={`To triage (${triage.length})`}>{table(triage, 'Nothing to triage.')}</Card>
      <Card title={`With a ticket (${ticket.length})`}>{table(ticket, 'No problem carries a ticket.')}</Card>
      <Collapse
        items={[
          { key: 'quiet', label: `Quiet for 30+ days (${quiet.length})`, children: table(quiet, 'No problem has been quiet that long.') },
          { key: 'ignored', label: `Not handling (${ignored.length})`, children: table(ignored, 'Nothing is marked not handling.') },
          {
            key: 'noise',
            label: `Filtered noise, last 7 days (${noiseTotal})`,
            children: (
              <Flex vertical gap="middle">
                {data.noise.map((group) => (
                  <Flex key={group.category} vertical gap={token.marginXXS}>
                    <Typography.Text strong>{NOISE_LABEL[group.category]} · {group.total}</Typography.Text>
                    {group.items.length === 0
                      ? <Typography.Text type="secondary">None</Typography.Text>
                      : group.items.map((item) => (
                          <Flex key={item.item} justify="space-between" gap="small">
                            <Typography.Text type="secondary" style={{ wordBreak: 'break-word' }}>{item.item}</Typography.Text>
                            <Typography.Text>{item.count}</Typography.Text>
                          </Flex>
                        ))}
                  </Flex>
                ))}
              </Flex>
            ),
          },
        ]}
      />
      <DecisionModal
        asking={asking}
        onCancel={() => setAsking(null)}
        onSave={(value) => (asking ? decide(asking.problem, asking.decision, value) : Promise.resolve())}
      />
    </Flex>
  )
}
