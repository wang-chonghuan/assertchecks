import { Link, createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { App, Breadcrumb, Button, Card, Descriptions, Flex, Popconfirm, Table, Tag, Tooltip, Typography, theme } from 'antd'
import { CopyOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { caseBugReport } from '../../../../../../../lib/bug-report'
import { ErrorLog } from '../../../../../../../components/error-log'
import type { TableColumnsType } from 'antd'
import { CaseStatusTag, ThenTag, utc } from '../../../../../../../components/status'
import type { CaseBug, CaseHistoryItem } from '../../../../../../../lib/types'
import { attachTicket, getCase, removeTicket } from '../../../../../../../server/fns'
import { AttachTicketModal, BugStatusTag, TicketUrl, ticketLabel } from '../../../../../../../components/tickets'
import { PRODUCT_NAME } from '../../../../../../../components/brand'
import { UNGROUPED, caseMeta } from '../../../../../../../lib/organize'
import { ASSERTCHECKS_STYLE, space, text } from '../../../../../../../infui/tokens'

export const Route = createFileRoute('/_app/p/$project/checks/$check/cases/$case')({
  // ?run=<number> shows the case as an older run found it; without it, as the latest full run did.
  validateSearch: (search: Record<string, unknown>): { run?: number } => {
    const run = Number(search.run)
    return Number.isSafeInteger(run) && run > 0 ? { run } : {}
  },
  loaderDeps: ({ search }) => ({ run: search.run === undefined ? undefined : String(search.run) }),
  loader: ({ params, deps }) =>
    getCase({ data: { project: params.project, check: params.check, case: params.case, run: deps.run } }),
  head: ({ params }) => ({ meta: [{ title: `${params.case} · ${PRODUCT_NAME}` }] }),
  component: CasePage,
})

function Steps({ items }: { items: string[] }) {
  return (
    <ol style={{ margin: 0, paddingInlineStart: ASSERTCHECKS_STYLE.listIndent }}>
      {items.map((item, index) => <li key={index}>{item}</li>)}
    </ol>
  )
}

// One case, top to bottom: what it says (steps and catalog fields), its bug in the run on screen with
// the error and tickets, then its result in every run.
function CasePage() {
  const { token } = theme.useToken()
  const { project, check, spec, run, result, history, viewingLatest, deployed, bug } = Route.useLoaderData()
  const { message } = App.useApp()
  const router = useRouter()
  const [attaching, setAttaching] = useState(false)
  const copyReport = async () => {
    const text = caseBugReport({
      origin: window.location.origin,
      project,
      check,
      run,
      deployed,
      spec,
      result,
      bug,
      history: history.slice(0, 10).map((item) => ({
        runId: item.run.id,
        status: item.status === null ? 'not in run' : item.failed && item.status === 'passed' ? 'failed' : item.status,
      })),
    })
    try {
      await navigator.clipboard.writeText(text)
      message.success('Copied. Paste it to your coding agent to file the bug ticket.')
    } catch {
      message.error('Copying failed. Allow clipboard access for this page and try again.')
    }
  }
  const runSearch = viewingLatest ? {} : { run: Number(run.id) }
  const meta = caseMeta(spec)
  const failed = result !== null && (result.status !== 'passed' || result.thens.some((then) => then.status === 'failed'))

  const removeLink = async (link: string) => {
    try {
      await removeTicket({ data: { project: project.slug, link } })
      await router.invalidate()
    } catch (error) {
      message.error(`Removing failed: ${(error as Error).message}`)
    }
  }
  // Then results that say where it stopped; passed ones say nothing.
  const stopped = (result?.thens ?? []).filter((then) => then.status !== 'passed')

  return (
    <Flex vertical gap={space.group}>
      <Breadcrumb
        items={[
          { title: <Link to="/p/$project" params={{ project: project.slug }}>{project.name}</Link> },
          { title: <Link to="/p/$project/checks/$check" params={{ project: project.slug, check: check.slug }} search={runSearch}>{check.name}</Link> },
          { title: spec.id },
        ]}
      />
      {/* 1. The case as written: its steps and its catalog fields, all open. */}
      <Card title={`${spec.id} · ${spec.title}`}>
        <Descriptions
          column={1}
          bordered
          size="small"
          styles={{ label: { width: token.controlHeight * 3 } }}
          items={[
            { key: 'given', label: 'Given', children: <Steps items={spec.given} /> },
            { key: 'when', label: 'When', children: <Steps items={spec.when} /> },
            {
              key: 'then',
              label: 'Then',
              children: (
                <Flex vertical gap={space.stack}>
                  {spec.then.map((then) => (
                    <Flex key={then.id} gap={space.stack} align="baseline">
                      <Typography.Text style={{ ...text.label, flex: 'none' }}>{then.id}</Typography.Text>
                      <Typography.Text>{then.expect}</Typography.Text>
                    </Flex>
                  ))}
                </Flex>
              ),
            },
            ...(spec.failure ? [{ key: 'cause', label: 'Known cause', children: spec.failure }] : []),
            { key: 'group', label: 'Group', children: meta.group ?? <Typography.Text style={text.caption}>{UNGROUPED}</Typography.Text> },
            {
              key: 'tags',
              label: 'Tags',
              children: meta.tags.length
                ? <Flex gap={space.stack} wrap>{meta.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</Flex>
                : <Typography.Text style={text.caption}>—</Typography.Text>,
            },
            ...(spec.type ? [{ key: 'type', label: 'Type', children: spec.type.toUpperCase() }] : []),
            { key: 'policy', label: 'Runs', children: spec.run === 'on-demand' ? 'On demand, only when named' : 'In every regular run' },
            { key: 'status', label: 'Status', children: spec.status },
          ]}
        />
      </Card>

      {/* 2. Its bug: how it ended in the run on screen, the error, and the tickets on it. */}
      <Card
        title="Bug"
        extra={(
          <Flex gap={space.stack} align="center">
            {bug && (
              <Tooltip title={SAY[bug.status](bug)}>
                <span><BugStatusTag status={bug.status} /></span>
              </Tooltip>
            )}
            <Button onClick={() => setAttaching(true)}>Attach ticket</Button>
          </Flex>
        )}
      >
        <Flex vertical gap={space.group}>
          <Flex gap={space.stack} wrap align="center">
            <Typography.Text style={text.caption}>{viewingLatest ? 'Latest run' : `Run #${run.id}`}, {utc(run.startedAt)}</Typography.Text>
            {result
              ? <CaseStatusTag status={failed && result.status === 'passed' ? 'failed' : result.status} />
              : <Tag>Not in this run</Tag>}
            {stopped.map((then) => <ThenTag key={then.id} id={then.id} status={then.status} caseStatus={result?.status ?? 'missing'} />)}
            {!viewingLatest && (
              <Link to="/p/$project/checks/$check/cases/$case" params={{ project: project.slug, check: check.slug, case: spec.id }}>
                Back to latest
              </Link>
            )}
          </Flex>
          {result?.error && <ErrorLog log={result.error} />}
          {failed && (
            <Flex>
              <Button icon={<CopyOutlined />} onClick={copyReport}>Copy for a bug ticket</Button>
            </Flex>
          )}
          {!failed && !bug && <Typography.Text style={text.body}>No open bug: it passed and has no ticket.</Typography.Text>}
          <TicketList tickets={bug?.tickets ?? []} onRemove={removeLink} />
        </Flex>
      </Card>

      <AttachTicketModal
        open={attaching}
        subject={`${spec.id} · ${spec.title}`}
        onCancel={() => setAttaching(false)}
        onSave={async (url) => {
          try {
            await attachTicket({ data: { project: project.slug, ticket: url, cases: [spec.id] } })
            setAttaching(false)
            await router.invalidate()
          } catch (error) {
            message.error(`Attaching failed: ${(error as Error).message}`)
          }
        }}
      />
      {history.length > 0 && (
        <Card title="Result in each run">
          <CaseHistory history={history} shownId={run.id} project={project.slug} check={check.slug} caseId={spec.id} />
        </Card>
      )}
    </Flex>
  )
}

// This case's result run by run, so a failure that comes and goes is visible.
function CaseHistory({ history, shownId, project, check, caseId }: {
  history: CaseHistoryItem[]; shownId: string; project: string; check: string; caseId: string
}) {
  const { token } = theme.useToken()
  const navigate = useNavigate()
  const pageSize = 10
  const shownIndex = history.findIndex((item) => item.run.id === shownId)
  const columns: TableColumnsType<CaseHistoryItem> = [
    { title: 'Run', key: 'run', render: (_, item) => <Typography.Text style={item.run.id === shownId ? text.label : undefined}>#{item.run.id}</Typography.Text> },
    { title: 'Started', key: 'started', render: (_, item) => utc(item.run.startedAt) },
    {
      title: 'Kind',
      key: 'kind',
      render: (_, item) => <Tag>{item.caseCount !== null ? 'Named cases' : item.run.trigger === 'schedule' ? 'Scheduled' : 'Manual'}</Tag>,
    },
    {
      title: 'This case',
      key: 'status',
      render: (_, item) => item.status === null
        ? <Typography.Text style={text.caption}>Not in this run</Typography.Text>
        : <CaseStatusTag status={item.failed && item.status === 'passed' ? 'failed' : item.status} />,
    },
  ]
  return (
    <Table
      rowKey={(item) => item.run.id}
      size="small"
      scroll={{ x: 'max-content' }}
      pagination={history.length > pageSize
        ? { pageSize, size: 'small', defaultCurrent: shownIndex < 0 ? 1 : Math.floor(shownIndex / pageSize) + 1 }
        : false}
      columns={columns}
      dataSource={history}
      // The whole row opens this case in that run; the run on screen stays highlighted.
      onRow={(item) => ({
        onClick: () => navigate({
          to: '/p/$project/checks/$check/cases/$case', params: { project, check, case: caseId }, search: { run: Number(item.run.id) },
        }),
        style: { cursor: 'pointer', background: item.run.id === shownId ? token.controlItemBgActive : undefined },
      })}
    />
  )
}

const SAY: Record<CaseBug['status'], (bug: CaseBug) => string> = {
  'needs-ticket': (bug) => bug.previous
    ? `It failed again after ${ticketLabel(bug.previous)} had fixed it. Attach a new ticket.`
    : 'It fails and no ticket covers it yet.',
  'in-progress': () => 'A ticket is on it. It counts as fixed once it passes twice in a row in every environment.',
  fixed: () => 'Passed twice in a row in every environment since its newest ticket.',
}

// Every ticket the bug was given, newest first, each removable when pasted by mistake.
function TicketList({ tickets, onRemove }: { tickets: CaseBug['tickets']; onRemove: (link: string) => Promise<void> }) {
  if (!tickets.length) return null
  return (
    <Flex vertical gap={space.stack}>
      <Typography.Text style={text.label}>Tickets</Typography.Text>
      {tickets.map((ticket) => (
        <Flex key={ticket.id} gap={space.stack} wrap align="center">
          <TicketUrl url={ticket.url} />
          <Typography.Text style={text.caption}>by {ticket.by}, {utc(ticket.at)}</Typography.Text>
          <Popconfirm title="Remove this ticket link?" description="Only for a link pasted by mistake." onConfirm={() => onRemove(ticket.id)}>
            <Button size="small" type="link">Remove</Button>
          </Popconfirm>
        </Flex>
      ))}
    </Flex>
  )
}
