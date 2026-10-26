import { Link, createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { Alert, App, Button, Card, Empty, Flex, Grid, Select, Table, Tabs, Tag, Tooltip, Typography, theme } from 'antd'
import type { TableColumnsType } from 'antd'
import { useState, type ReactNode } from 'react'
import { CopyOutlined, ExportOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { latestBugReport } from '../../../../../../lib/bug-report'
import {
  CaseStatusTag, CheckStatusTag, OutcomeTag, OutsideRunTag, Sha, ThenTag, utc,
} from '../../../../../../components/status'
import { attachTicket, getBugReport, getCheck } from '../../../../../../server/fns'
import { AttachTicketModal, BugStatusTag, BugTicketLine } from '../../../../../../components/tickets'
import type { CaseResult, OutsideCase, RunHistoryItem, Versions } from '../../../../../../lib/types'
import { PRODUCT_NAME } from '../../../../../../components/brand'
import { CheckSummary } from '../../../../../../components/check-summary'
import { ErrorLog } from '../../../../../../components/error-log'
import { UNGROUPED, groupOrder, type CaseMeta } from '../../../../../../lib/organize'
import { space, text } from '../../../../../../infui/tokens'

export const Route = createFileRoute('/_app/p/$project/checks/$check/')({
  // ?run=<number> opens an older run from the history; without it the page shows the latest full run.
  validateSearch: (search: Record<string, unknown>): { run?: number } => {
    const run = Number(search.run)
    return Number.isSafeInteger(run) && run > 0 ? { run } : {}
  },
  loaderDeps: ({ search }) => ({ run: search.run === undefined ? undefined : String(search.run) }),
  loader: ({ params, deps }) => getCheck({ data: { project: params.project, check: params.check, run: deps.run } }),
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.check.name ?? 'Check'} · ${PRODUCT_NAME}` }] }),
  component: CheckPage,
})

// The filter value for cases without a group; the select needs a string.
const UNGROUPED_KEY = '\u0000ungrouped'

function CheckPage() {
  const { project, check, latest, caseMeta, history, viewingLatest, bugs } = Route.useLoaderData()
  const { message } = App.useApp()
  const router = useRouter()
  // Not passed cases picked for one ticket, and the cases the attach dialog is open for.
  const [selected, setSelected] = useState<string[]>([])
  const [attaching, setAttaching] = useState<string[] | null>(null)
  // Case links keep the run being viewed, so a case opens with that run's result.
  const runSearch = viewingLatest || !latest ? {} : { run: Number(latest.id) }
  const { token } = theme.useToken()
  const wide = Grid.useBreakpoint().md
  // Filters only narrow what is listed; the summary card's outcome and counts stay whole.
  const [groupFilter, setGroupFilter] = useState<string>()
  const [tagFilter, setTagFilter] = useState<string>()
  const metaOf = (id: string): CaseMeta => caseMeta[id] ?? { group: null, tags: [] }
  const shown = (id: string) =>
    (groupFilter === undefined || (metaOf(id).group ?? UNGROUPED_KEY) === groupFilter) &&
    (tagFilter === undefined || metaOf(id).tags.includes(tagFilter))

  const allFailed = check.notPassed
  const failedIds = new Set(allFailed.map((item) => item.case))
  const ids = [...(latest?.summary ?? []).map((item) => item.case), ...check.outsideRun.map((item) => item.case)]
  const failed = allFailed.filter((item) => shown(item.case))
  const passed = (latest?.summary ?? []).filter((item) => !failedIds.has(item.case) && shown(item.case))
  const outside = check.outsideRun.filter((item) => shown(item.case))
  const showing = ids.filter(shown).length
  const filtered = groupFilter !== undefined || tagFilter !== undefined

  const groupOptions = groupOrder(ids.map((id) => metaOf(id).group))
    .map((group) => ({ value: group ?? UNGROUPED_KEY, label: group ?? UNGROUPED }))
  const tagOptions = [...new Set(ids.flatMap((id) => metaOf(id).tags))].sort((a, b) => a.localeCompare(b))
    .map((tag) => ({ value: tag, label: tag }))
  const organized = groupOptions.some((option) => option.value !== UNGROUPED_KEY) || tagOptions.length > 0

  // Each tab lists its cases in group sections, every case once; a catalog without groups keeps one
  // plain table.
  const byGroup = <T,>(rows: T[], id: (row: T) => string, table: (rows: T[], header: boolean) => ReactNode) => {
    const groups = groupOrder(rows.map((row) => metaOf(id(row)).group))
    if (groups.length === 0 || (groups.length === 1 && groups[0] === null)) return table(rows, true)
    return (
      <Flex vertical gap={space.block}>
        {groups.map((group, index) => {
          const inGroup = rows.filter((row) => metaOf(id(row)).group === group)
          return (
            <Flex key={group ?? UNGROUPED_KEY} vertical gap={space.stack}>
              <Flex align="center" gap={space.stack}>
                <Typography.Text style={group === null ? text.caption : text.label}>{group ?? UNGROUPED}</Typography.Text>
                <Tag variant="filled">{inGroup.length}</Tag>
              </Flex>
              {table(inGroup, index === 0)}
            </Flex>
          )
        })}
      </Flex>
    )
  }

  const caseLink = (id: string, title: string, extra?: ReactNode) => (
    <Flex vertical>
      <Flex gap={space.stack} align="center" wrap>
        <Link to="/p/$project/checks/$check/cases/$case" params={{ project: project.slug, check: check.slug, case: id }} search={runSearch}>
          {id}
        </Link>
        {extra}
      </Flex>
      <Typography.Text style={text.body}>{title.replace(/^[A-Z0-9-]+:\s*/, '')}</Typography.Text>
    </Flex>
  )
  // Fixed leading widths keep columns aligned across group sections.
  const caseWidth = token.controlHeight * 10
  const resultWidth = token.controlHeight * 5
  const ticketWidth = token.controlHeight * 7
  // Does this bug need a ticket, is one on it, is it fixed; the full history is on the case page.
  const ticketCell = (id: string) => {
    const bug = bugs[id]
    return (
      <Flex vertical gap={space.stack} align="flex-start">
        {bug && <BugStatusTag status={bug.status} />}
        {bug && <BugTicketLine bug={bug} />}
        {bug?.status !== 'in-progress' && (
          <Button size="small" onClick={() => setAttaching([id])}>Attach ticket</Button>
        )}
      </Flex>
    )
  }
  const failedColumns: TableColumnsType<CaseResult> = [
    {
      title: 'Case',
      dataIndex: 'case',
      width: caseWidth,
      // A plain failure is what this tab is; only another status needs saying.
      render: (id: string, item) => caseLink(id, item.title, item.status === 'failed' || item.status === 'passed' ? null : <CaseStatusTag status={item.status} />),
    },
    {
      title: 'Where it stopped',
      dataIndex: 'thens',
      width: resultWidth,
      render: (thens: CaseResult['thens'], item) => {
        // A case that failed before its first Then has no Then to blame; say so once.
        if (item.status !== 'passed' && !thens.some((then) => then.status !== 'not_run')) {
          return <Tag color="error">Stopped before {thens[0]?.id ?? 'its first Then'}</Tag>
        }
        return (
          <Flex gap={space.stack} wrap>
            {thens.filter((then) => then.status !== 'passed')
              .map((then) => <ThenTag key={then.id} id={then.id} status={then.status} caseStatus={item.status} />)}
          </Flex>
        )
      },
    },
    { title: 'Ticket', key: 'ticket', width: ticketWidth, render: (_, item) => ticketCell(item.case) },
  ]
  const passedColumns: TableColumnsType<CaseResult> = [
    { title: 'Case', dataIndex: 'case', render: (id: string, item) => caseLink(id, item.title) },
  ]
  const outsideColumns: TableColumnsType<OutsideCase> = [
    { title: 'Case', dataIndex: 'case', width: caseWidth, render: (id: string, item) => caseLink(id, item.title) },
    { title: 'Why', key: 'kind', render: (_, item) => <OutsideRunTag status={item.status} run={item.run} /> },
  ]

  const failedTable = (rows: CaseResult[], header: boolean) => (
    <Table
      showHeader={header}
      rowKey="case"
      size="small"
      pagination={false}
      // Fixed widths keep every group section's columns on the same lines; phones scroll inside the card.
      tableLayout="fixed"
      scroll={{ x: token.controlHeight * 20 }}
      columns={failedColumns}
      dataSource={rows}
      // Selections across group sections add up to one list for a shared ticket.
      rowSelection={{
        selectedRowKeys: selected.filter((id) => rows.some((row) => row.case === id)),
        onChange: (keys) => setSelected((previous) => [
          ...previous.filter((id) => !rows.some((row) => row.case === id)), ...keys.map(String),
        ]),
      }}
      locale={{ emptyText: <Empty description="No failed cases in the latest run." /> }}
      expandable={{
        rowExpandable: (item) => Boolean(item.error),
        expandedRowRender: (item) => <ErrorLog log={item.error ?? ''} />,
      }}
    />
  )

  const outsideTable = (rows: OutsideCase[], header: boolean, empty: string) => (
    <Table
      showHeader={header}
      rowKey="case"
      size="small"
      pagination={false}
      columns={outsideColumns}
      dataSource={rows}
      locale={{ emptyText: <Empty description={empty} /> }}
      expandable={{
        rowExpandable: (item) => Boolean(item.note),
        expandedRowRender: (item) => <Typography.Paragraph style={{ margin: 0 }}>{item.note}</Typography.Paragraph>,
      }}
    />
  )


  const copyBugs = (
    <Button
                    type="primary"
                    icon={<CopyOutlined />}
                    onClick={async () => {
                      const pending = getBugReport({ data: { project: project.slug, check: check.slug } })
                        .then((report) => ({ report, text: latestBugReport(window.location.origin, report) }))
                      try {
                        await navigator.clipboard.write([new ClipboardItem({
                          'text/plain': pending.then(({ text }) => new Blob([text], { type: 'text/plain' })),
                        })])
                        const { report } = await pending
                        message.success(`Copied ${report.cases.length} case${report.cases.length === 1 ? '' : 's'} from run #${report.run?.id ?? '—'}. Paste it to your coding agent to file the bug tickets.`)
                      } catch {
                        message.error('Copying failed. Allow clipboard access for this page and try again.')
                      }
                    }}
                  >
                    Copy bugs from the latest run
                  </Button>
  )

  return (
    <Flex vertical gap={space.group}>
      {/* The page's one title: the project it belongs to, then the check. */}
      <Flex align="center" justify="space-between" gap={space.stack} wrap>
        <Typography.Title level={2} style={{ ...text.heading2, margin: 0 }}>
          <Link to="/p/$project" params={{ project: project.slug }}>{project.name}</Link> / {check.name}
        </Typography.Title>
        <Flex align="center" gap={space.stack} wrap>
          {viewingLatest || !latest ? <CheckStatusTag status={check.status} /> : <OutcomeTag run={latest} />}
          {latest?.runUrl && (
            <Typography.Link href={latest.runUrl} target="_blank" rel="noreferrer">
              {latest.runnerKind === 'github-actions' ? 'GitHub Actions run' : 'CI run'} <ExportOutlined />
            </Typography.Link>
          )}
        </Flex>
      </Flex>
      {!viewingLatest && latest && (
        <Alert
          type="info"
          showIcon
          title={`Run #${latest.id}, ${utc(latest.startedAt)}${latest.caseCount ? ` · ${latest.caseCount} named cases` : ''}`}
          action={<Link to="/p/$project/checks/$check" params={{ project: project.slug, check: check.slug }}>Back to latest</Link>}
        />
      )}
      <Card>
        <CheckSummary check={check} />
      </Card>
      {history.length > 0 && (
        <Card title="Run history">
          <RunHistory history={history} shownId={latest?.id ?? null} project={project.slug} check={check.slug} />
        </Card>
      )}
      {latest && (
        <Card>
          {organized && (
            <Flex gap={space.stack} wrap align="center" style={{ marginBottom: space.stack }}>
              <Select
                allowClear
                aria-label="Filter by group"
                placeholder="All groups"
                value={groupFilter}
                onChange={setGroupFilter}
                options={groupOptions}
                style={{ minWidth: token.controlHeight * 5 }}
              />
              <Select
                allowClear
                showSearch
                aria-label="Filter by tag"
                placeholder="All tags"
                value={tagFilter}
                onChange={setTagFilter}
                options={tagOptions}
                style={{ minWidth: token.controlHeight * 5 }}
              />
              {filtered && (
                <Typography.Text style={text.caption}>Showing {showing} of {ids.length} cases</Typography.Text>
              )}
            </Flex>
          )}
          {/* On phones the copy button sits above the tabs instead of covering their names. */}
          {!wide && <Flex style={{ marginBottom: space.stack }}>{copyBugs}</Flex>}
          <Tabs
            defaultActiveKey={failed.length ? 'failed' : 'passed'}
            // Every case that did not pass in the latest full run, as a report a coding agent can file
            // tickets from. The report is read when clicked; the clipboard receives it as a pending value
            // so a slow read does not lose the browser's permission to write.
            tabBarExtraContent={wide ? copyBugs : undefined}
            items={[
              {
                key: 'failed',
                label: `Not passed (${failed.length})`,
                children: (
                  <Flex vertical gap={space.stack}>
                    {failed.length > 0 && (
                      <Flex>
                        <Tooltip title="For cases with the same cause.">
                          <Button disabled={!selected.length} onClick={() => setAttaching(selected)}>
                            Attach one ticket to {selected.length || 'the'} selected case{selected.length === 1 ? '' : 's'}
                          </Button>
                        </Tooltip>
                      </Flex>
                    )}
                    {byGroup(failed, (item) => item.case, failedTable)}
                  </Flex>
                ),
              },
              {
                key: 'passed',
                label: `Passed (${passed.length})`,
                children: byGroup(passed, (item) => item.case, (rows) => (
                  <Table
                    showHeader={false}
                    rowKey="case"
                    size="small"
                    pagination={false}
                    columns={passedColumns}
                    dataSource={rows}
                    locale={{ emptyText: <Empty description="No passed cases in the latest run." /> }}
                  />
                )),
              },
              {
                key: 'outside',
                label: `Not in regular runs (${outside.length})`,
                children: byGroup(outside, (item) => item.case, (rows, header) => outsideTable(rows, header, 'Every catalog case ran.')),
              },
            ]}
          />
        </Card>
      )}
      <AttachTicketModal
        open={attaching !== null}
        subject={attaching?.join(', ')}
        onCancel={() => setAttaching(null)}
        onSave={async (url) => {
          try {
            await attachTicket({ data: { project: project.slug, ticket: url, cases: attaching ?? [] } })
            message.success(`Ticket attached to ${attaching?.join(', ')}.`)
            setAttaching(null)
            setSelected([])
            await router.invalidate()
          } catch (error) {
            message.error(`Attaching failed: ${(error as Error).message}`)
          }
        }}
      />
    </Flex>
  )
}

// A column title with its explanation behind a question-mark tooltip.
function Explained({ title, help }: { title: string; help: string }) {
  return (
    <Flex gap={space.stack} align="center">
      {title}
      <Tooltip title={help}>
        <Typography.Text style={text.caption} aria-label={`About ${title}`}><QuestionCircleOutlined /></Typography.Text>
      </Tooltip>
    </Flex>
  )
}

// Every stored run, newest first: open one to see exactly what it found, even after newer runs replaced it.
function RunHistory({ history, shownId, project, check }: {
  history: RunHistoryItem[]; shownId: string | null; project: string; check: string
}) {
  const { token } = theme.useToken()
  const navigate = useNavigate()
  const pageSize = 5
  const shownIndex = history.findIndex((run) => run.id === shownId)
  const columns: TableColumnsType<RunHistoryItem> = [
    { title: 'Run', dataIndex: 'id', render: (id: string) => <Typography.Text style={id === shownId ? text.label : undefined}>#{id}</Typography.Text> },
    { title: 'Started', dataIndex: 'startedAt', render: (at: string) => utc(at) },
    {
      title: 'Kind',
      key: 'kind',
      render: (_, run) => (
        <Flex gap={space.stack} wrap>
          <Tag>{run.trigger === 'schedule' ? 'Scheduled' : 'Manual'}</Tag>
          {run.caseCount !== null && <Tag variant="filled">{run.caseCount} named cases</Tag>}
        </Flex>
      ),
    },
    {
      title: 'Result',
      key: 'result',
      render: (_, run) => (
        <Flex gap={space.stack} align="center" wrap>
          {(!run.tally || run.timedOut || run.outcome === 'incomplete' || run.outcome === 'running') && <OutcomeTag run={run} />}
          {/* Failed of the cases that ran, as one badge: red when any failed, green when none did. */}
          {run.tally && (
            <Tag color={run.tally.failed > 0 ? 'error' : 'success'}>
              {run.tally.failed}/{run.tally.ran} failed{run.tally.incomplete > 0 ? ` · ${run.tally.incomplete} incomplete` : ''}
            </Tag>
          )}
        </Flex>
      ),
    },
    // Copying a SHA must not open the run under it.
    {
      title: <Explained title="Test commit" help="The commit of the test code that ran: the CI commit when the run came from GitHub Actions, otherwise the Git HEAD of the folder the tests ran in." />,
      dataIndex: 'testSha',       render: (sha: string | null) => <span onClick={(event) => event.stopPropagation()}><Sha value={sha} /></span>,
    },
    ...(!history.some((run) => run.deployed && Object.keys(run.deployed).length) ? [] : [{
      title: <Explained title="Deployed" help="The commit of each tested component when the run started, read from the version URLs the project registers (for example web and api). A run passes only if they are unchanged at its end." />,
      dataIndex: 'deployed',
      render: (deployed: Versions | null) => deployed && Object.keys(deployed).length
        ? (
          <Flex vertical onClick={(event) => event.stopPropagation()}>
            {Object.keys(deployed).sort().map((name) => (
              <Flex key={name} gap={space.stack} align="center">
                <Typography.Text style={text.caption}>{name}</Typography.Text>
                <Sha value={deployed[name]} />
              </Flex>
            ))}
          </Flex>
        )
        : <Typography.Text style={text.caption}>not recorded</Typography.Text>,
    }]),
  ]
  return (
    <Table
      rowKey="id"
      size="small"
      scroll={{ x: 'max-content' }}
      // Five rows keep the history compact above the case list, opening on the page of the run shown.
      pagination={history.length > pageSize
        ? { pageSize, size: 'small', defaultCurrent: shownIndex < 0 ? 1 : Math.floor(shownIndex / pageSize) + 1 }
        : false}
      columns={columns}
      dataSource={history}
      // The whole row opens its run; the run on screen stays highlighted. A run still in progress has
      // nothing to show yet.
      onRow={(run) => ({
        onClick: run.finishedAt === null ? undefined : () =>
          navigate({ to: '/p/$project/checks/$check', params: { project, check }, search: { run: Number(run.id) } }),
        style: {
          cursor: run.finishedAt === null ? undefined : 'pointer',
          background: run.id === shownId ? token.controlItemBgActive : undefined,
        },
      })}
    />
  )
}
