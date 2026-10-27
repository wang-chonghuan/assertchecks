import { Alert, App, Button, Card, Collapse, Descriptions, Dropdown, Empty, Flex, Form, Grid, Input, Modal, Popconfirm, Skeleton, Table, Tag, Tooltip, Typography, theme } from 'antd'
import type { TableColumnsType } from 'antd'
import { ExportOutlined, MoreOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { attachTicket, decideProblem, getProductionErrors, removeTicket } from '../server/fns'
import { AttachTicketModal, TicketUrl } from './tickets'
import { ErrorLog } from './error-log'
import type { NoiseCategory, ProblemGroup, ProblemView, ProductionErrors } from '../lib/types'
import { utc } from './status'
import { ASSERTCHECKS_STYLE, space, text } from '../infui/tokens'

const NOISE_LABEL: Record<NoiseCategory, string> = {
  client: '4xx responses',
  scanner: 'Scanner probes',
  aborted: 'Requests the client aborted',
  analytics: 'Blocked analytics calls',
  script: 'Cross-origin "Script error."',
}

// The folded groups line up with the cards above them.
const { cardPadding } = ASSERTCHECKS_STYLE

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`
const unit = (problem: ProblemView) => (problem.kind === 'slow' ? 'slow hour' : 'failure')

// The last 30 days of failures that need handling, one bar a day.
function DailyBars({ daily }: { daily: ProductionErrors['daily'] }) {
  const { token } = theme.useToken()
  const max = Math.max(1, ...daily.map((day) => day.count))
  const peak = daily.reduce((top, day) => (day.count > top.count ? day : top), { day: '', count: 0 })
  const peakText = peak.count ? `Peak ${plural(peak.count, 'failure')} on ${peak.day}` : 'No failures in 30 days'
  // On phones the peak gets its own line instead of squeezing between the two dates.
  const wide = Grid.useBreakpoint().md
  return (
    <Flex vertical gap={space.stack}>
      <Flex align="end" gap={ASSERTCHECKS_STYLE.barGap} style={{ height: ASSERTCHECKS_STYLE.barsHeight }} role="img" aria-label="Failures per day, last 30 days">
        {daily.map((day) => (
          <Tooltip key={day.day} title={`${day.day} · ${plural(day.count, 'failure')}`}>
            <div
              style={{
                flex: 1,
                height: `${(day.count / max) * 100}%`,
                // A day with failures always shows; a quiet day is a thin baseline.
                minHeight: day.count ? ASSERTCHECKS_STYLE.barMinHeight : token.lineWidthBold,
                background: day.count ? token.colorError : token.colorFillSecondary,
                borderRadius: token.borderRadiusXS,
              }}
            />
          </Tooltip>
        ))}
      </Flex>
      <Flex justify="space-between" gap={space.stack}>
        <Typography.Text style={text.caption}>{daily[0]?.day}</Typography.Text>
        {wide && <Typography.Text style={text.caption}>{peakText}</Typography.Text>}
        <Typography.Text style={text.caption}>{daily.at(-1)?.day}</Typography.Text>
      </Flex>
      {!wide && <Typography.Text style={text.caption}>{peakText}</Typography.Text>}
    </Flex>
  )
}

// Why a problem is not going to be handled; tickets go through the attach dialog.
function NotHandlingModal({ problem, onCancel, onSave }: {
  problem: ProblemView | null
  onCancel: () => void
  onSave: (value: string) => Promise<void>
}) {
  const [form] = Form.useForm<{ value: string }>()
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (problem) form.setFieldsValue({ value: '' }) }, [problem, form])
  return (
    <Modal
      open={problem !== null}
      title="Not handling"
      okText="Mark not handling"
      confirmLoading={saving}
      onCancel={onCancel}
      onOk={async () => {
        const { value } = await form.validateFields()
        setSaving(true)
        try { await onSave(value.trim()) } finally { setSaving(false) }
      }}
      destroyOnHidden
    >
      <Typography.Paragraph style={text.body} ellipsis={{ rows: 2 }}>{problem?.key}</Typography.Paragraph>
      <Form form={form} layout="vertical">
        <Form.Item
          name="value"
          label="Why it is not handled"
          rules={[{ required: true, whitespace: true, message: 'Say in one line why.' }, { max: 256 }]}
        >
          <Input placeholder="e.g. browser extension, users are not affected" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

function ProblemDetail({ problem, onRemove }: { problem: ProblemView; onRemove: (link: string) => void }) {
  const { token } = theme.useToken()
  return (
    <Flex vertical gap={space.stack}>
      {problem.tickets.length > 0 && (
        <Flex vertical gap={space.stack} align="flex-start" onClick={(event) => event.stopPropagation()}>
          <Typography.Text style={text.label}>Tickets</Typography.Text>
          {problem.tickets.map((ticket) => (
            <Flex key={ticket.id} gap={space.stack} wrap align="center">
              <TicketUrl url={ticket.url} />
              <Typography.Text style={text.caption}>by {ticket.by}, {utc(ticket.at)}</Typography.Text>
              <Popconfirm title="Remove this ticket link?" description="Only for a link pasted by mistake." onConfirm={() => onRemove(ticket.id)}>
                <Button size="small" type="link">Remove</Button>
              </Popconfirm>
            </Flex>
          ))}
        </Flex>
      )}
      <Descriptions
        size="small"
        column={{ xs: 1, sm: 1, md: 2, lg: 3, xl: 3, xxl: 3 }}
        items={[
          { key: 'first', label: 'First seen', children: utc(problem.firstSeen) },
          { key: 'last', label: 'Last seen', children: utc(problem.lastSeen) },
          { key: 'where', label: 'Where', children: problem.place ?? '—' },
          { key: 'app', label: problem.browser ? 'Source' : 'App role', children: problem.browser ? 'Browser' : (problem.role ?? '—') },
          ...(problem.slow ? [{ key: 'slow', label: 'Slowest recent hour', children: `p95 ${problem.slow.p95Ms} ms (usually ${problem.slow.usualMs} ms)` }] : []),
        ]}
      />
      {problem.variants.length > 0 && (
        <Table
          size="small"
          rowKey="template"
          pagination={false}
          columns={[
            { title: 'Message', dataIndex: 'template', render: (text: string) => <Typography.Text style={{ wordBreak: 'break-word' }}>{text || '—'}</Typography.Text> },
            { title: 'Failures', dataIndex: 'count', width: token.controlHeight * 3 },
            { title: 'Last', dataIndex: 'lastAt', responsive: ['md'], width: token.controlHeight * 5, render: utc },
          ]}
          dataSource={problem.variants}
        />
      )}
      {problem.latest && (
        <Flex vertical gap={space.stack}>
          <Typography.Text style={text.label}>Latest failure on {utc(problem.latest.at)}</Typography.Text>
          <Typography.Text style={{ wordBreak: 'break-word' }}>{problem.latest.type ? `${problem.latest.type}: ` : ''}{problem.latest.message}</Typography.Text>
          {problem.latest.stack && <ErrorLog log={problem.latest.stack} />}
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
  const [ignoring, setIgnoring] = useState<ProblemView | null>(null)
  const [attaching, setAttaching] = useState<ProblemView | null>(null)

  const load = useCallback(async () => {
    try {
      setData(await getProductionErrors({ data: { project } }))
      setFailed(null)
    } catch (error) {
      setFailed((error as Error).message)
    }
  }, [project])
  useEffect(() => { void load() }, [load])

  // Every change saves, closes its dialog and reloads; a failure says why.
  const save = async (change: () => Promise<unknown>) => {
    try {
      await change()
      setIgnoring(null)
      setAttaching(null)
      await load()
    } catch (error) {
      message.error(`Saving failed: ${(error as Error).message}`)
    }
  }
  const decide = (problem: ProblemView, decision: 'ignored' | 'none', reason?: string) =>
    save(() => decideProblem({ data: { project, problem: problem.id, decision, reason } }))

  if (failed) return <Alert type="error" showIcon title="Production errors could not be loaded" description={failed} />
  if (!data) return <Card><Skeleton active /></Card>
  if (data.state === 'not-connected') {
    return (
      <Card>
        <Empty
          description={
            <Flex vertical>
              <Typography.Text style={text.label}>Not connected</Typography.Text>
              <Typography.Text style={text.body}>
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
        title="Production telemetry could not be read"
        description={`The errors below are unknown until it can. ${data.error}`}
        action={data.portalUrl ? <Button href={data.portalUrl} target="_blank" icon={<ExportOutlined />}>Azure</Button> : undefined}
      />
    )
  }

  const { headline } = data
  const inGroup = (group: ProblemGroup) => data.problems.filter((problem) => problem.group === group)

  const statusOf = (problem: ProblemView): ReactNode => {
    if (problem.ignored) {
      return (
        <Flex vertical>
          <Typography.Text>{problem.ignored.reason}</Typography.Text>
          <Typography.Text style={text.caption}>Not handling, by {problem.ignored.by}, {utc(problem.ignored.at)}</Typography.Text>
        </Flex>
      )
    }
    const newest = problem.tickets[0]
    if (!newest) return null
    const since = problem.sinceTicket
    return (
      <Flex vertical gap={space.stack} align="flex-start">
        <TicketUrl url={newest.url} />
        <Flex gap={space.stack} wrap align="center">
          {since && since.count > 0
            ? <Tag color="error">Still occurring: {plural(since.count, unit(problem))} since the ticket</Tag>
            : <Tag>{since?.quietDays ? `No occurrence for ${plural(since.quietDays, 'day')} since the ticket` : 'No occurrence since the ticket'}</Tag>}
          <Typography.Text style={text.caption}>
            by {newest.by}, {utc(newest.at)}{problem.tickets.length > 1 ? ` · ${problem.tickets.length - 1} earlier ticket${problem.tickets.length > 2 ? 's' : ''}` : ''}
          </Typography.Text>
        </Flex>
      </Flex>
    )
  }

  // One menu per row, so the list reads as problems rather than buttons. Picking never opens the row.
  const actionsOf = (problem: ProblemView): ReactNode => {
    const items = problem.ignored
      ? [{ key: 'undo', label: 'Undo not handling', onClick: () => void decide(problem, 'none') }]
      : [
          { key: 'ticket', label: problem.tickets.length ? 'Add ticket' : 'Attach ticket', onClick: () => setAttaching(problem) },
          ...(problem.tickets.length ? [] : [{ key: 'ignore', label: 'Not handling', onClick: () => setIgnoring(problem) }]),
        ]
    return (
      <span onClick={(event) => event.stopPropagation()}>
        <Dropdown menu={{ items }} trigger={['click']}>
          <Button size="small" type="text" icon={<MoreOutlined />} aria-label={`Actions for ${problem.key}`} />
        </Dropdown>
      </span>
    )
  }

  // Rows hold several lines; their first lines line up when every cell starts at the top.
  const top = () => ({ style: { verticalAlign: 'top' as const } })
  const columns: TableColumnsType<ProblemView> = [
    {
      title: 'Problem',
      key: 'problem',
      onCell: top,
      render: (_, problem) => (
        <Flex vertical gap={space.stack} align="flex-start">
          <Flex vertical>
            <Flex gap={space.stack} wrap align="center">
              {problem.isNew && <Tag color="processing">New</Tag>}
              {problem.kind === 'slow' && <Tag color="warning">Slow</Tag>}
              <Typography.Text style={{ ...text.label, wordBreak: 'break-word' }}>{problem.key}</Typography.Text>
            </Flex>
            <Typography.Text style={{ ...text.body, wordBreak: 'break-word' }}>
              {problem.slow
                ? `p95 ${problem.slow.p95Ms} ms in its latest slow hour, usually ${problem.slow.usualMs} ms`
                : [problem.place, problem.browser ? 'Browser' : problem.role].filter(Boolean).join(' · ') || '—'}
            </Typography.Text>
          </Flex>
          {statusOf(problem)}
        </Flex>
      ),
    },
    {
      title: 'Failures',
      key: 'count',
      width: token.controlHeight * 6,
      onCell: top,
      render: (_, problem) => (
        <Flex vertical>
          <Typography.Text>{plural(problem.count7d, unit(problem))} in 7 days</Typography.Text>
          <Typography.Text style={text.caption}>{problem.count90d} in 90 days</Typography.Text>
        </Flex>
      ),
    },
    { title: 'Last seen', dataIndex: 'lastSeen', responsive: ['md'], width: token.controlHeight * 5, onCell: top, render: utc },
    { title: '', key: 'actions', width: token.controlHeight * 1.5, onCell: top, render: (_, problem) => actionsOf(problem) },
  ]

  // An empty group says so in a line; its count is already in the title.
  const table = (rows: ProblemView[], empty: string) => (rows.length === 0 ? <Typography.Text style={text.caption}>{empty}</Typography.Text> : (
    <Table
      rowKey="id"
      size="middle"
      pagination={false}
      // Fixed layout lets long problem names wrap; below this width the table scrolls inside its card.
      tableLayout="fixed"
      scroll={{ x: token.controlHeight * 20 }}
      columns={columns}
      dataSource={rows}
      // The expand icon sits at the row's end so problem names line up with the card title; the whole row opens.
      expandable={{
        expandedRowRender: (problem) => (
          <ProblemDetail problem={problem} onRemove={(link) => save(() => removeTicket({ data: { project, link } }))} />
        ),
        expandRowByClick: true,
        expandIconColumnIndex: columns.length,
        columnWidth: token.controlHeight,
      }}
      onRow={() => ({ style: { cursor: 'pointer' } })}
    />
  ))

  const triage = inGroup('triage')
  // Problems happening now need a ticket; untriaged ones not seen in the past 7 days and every problem
  // quiet for 30+ days wait folded together, most recent first.
  const needsTicket = triage.filter((problem) => problem.count7d > 0 || problem.isNew)
  const inProgress = inGroup('ticket')
  const notSeen = [...triage.filter((problem) => !(problem.count7d > 0 || problem.isNew)), ...inGroup('quiet')]
    .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))
  const ignored = inGroup('ignored')
  const noiseTotal = data.noise.reduce((total, item) => total + item.total, 0)
  const figures = [
    { label: 'Needs a ticket', value: needsTicket.length, note: headline.isNew ? `${headline.isNew} new` : null },
    { label: 'In progress', value: inProgress.length, note: inProgress.length ? `${headline.stillOccurring} still occurring` : null },
    {
      label: 'Failures in the last 24 h',
      value: headline.last24h,
      note: `${headline.previous24h} the day before`,
      help: 'One failed request or page visit counts once; noise is excluded.',
    },
  ]
  const folds = [
    { key: 'not-seen', label: `Not seen recently (${notSeen.length})`, children: table(notSeen, 'Every problem was seen in the past 7 days.') },
    { key: 'ignored', label: `Not handling (${ignored.length})`, children: table(ignored, 'Nothing is marked not handling.') },
    {
      key: 'noise',
      label: `Filtered noise in the last 7 days (${noiseTotal})`,
      children: (
        <Flex vertical gap={space.group} style={{ maxWidth: token.controlHeight * 20 }}>
          {data.noise.map((group) => (
            <Flex key={group.category} vertical>
              <Typography.Text style={text.label}>{NOISE_LABEL[group.category]} · {group.total}</Typography.Text>
              {group.items.length === 0
                ? <Typography.Text style={text.caption}>None</Typography.Text>
                : group.items.map((item) => (
                    <Flex key={item.item} justify="space-between" gap={space.stack}>
                      <Typography.Text style={{ ...text.caption, wordBreak: 'break-word' }}>{item.item}</Typography.Text>
                      <Typography.Text>{item.count}</Typography.Text>
                    </Flex>
                  ))}
            </Flex>
          ))}
        </Flex>
      ),
    },
  ]

  return (
    <Flex vertical gap={space.group}>
      <Card>
        <Flex vertical gap={space.group}>
          <Flex gap={space.group}>
            {figures.map((figure) => (
              <Flex key={figure.label} vertical style={{ flex: '1 1 0', minWidth: 0 }}>
                <Typography.Text style={text.heading1}>{figure.value}</Typography.Text>
                <Flex gap={space.inline} align="center">
                  <Typography.Text style={text.label}>{figure.label}</Typography.Text>
                  {figure.help && (
                    <Tooltip title={figure.help}>
                      <Typography.Text style={text.caption} aria-label={`About ${figure.label}`}><QuestionCircleOutlined /></Typography.Text>
                    </Tooltip>
                  )}
                </Flex>
                {figure.note && <Typography.Text style={text.caption}>{figure.note}</Typography.Text>}
              </Flex>
            ))}
          </Flex>
          <DailyBars daily={data.daily} />
          <Typography.Text style={text.caption}>
            Read {utc(data.checkedAt)}
            {data.portalUrl && <> · <Typography.Link href={data.portalUrl} target="_blank">Open in Azure <ExportOutlined /></Typography.Link></>}
          </Typography.Text>
        </Flex>
      </Card>
      <Card title={`Needs a ticket (${needsTicket.length})`}>{table(needsTicket, 'No problem seen in the past 7 days needs a ticket.')}</Card>
      <Card title={`In progress (${inProgress.length})`}>{table(inProgress, 'No problem carries a ticket.')}</Card>
      <Collapse
        bordered={false}
        style={{ background: token.colorBgContainer }}
        items={folds.map((item) => ({ ...item, styles: { header: { paddingInline: cardPadding }, body: { paddingInline: cardPadding } } }))}
      />
      <NotHandlingModal
        problem={ignoring}
        onCancel={() => setIgnoring(null)}
        onSave={(value) => (ignoring ? decide(ignoring, 'ignored', value) : Promise.resolve())}
      />
      <AttachTicketModal
        open={attaching !== null}
        subject={attaching?.key}
        onCancel={() => setAttaching(null)}
        onSave={(url) => (attaching
          ? save(() => attachTicket({ data: { project, ticket: url, problem: attaching.id } }))
          : Promise.resolve())}
      />
    </Flex>
  )
}
