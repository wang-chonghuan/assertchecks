import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Alert, App, Breadcrumb, Button, Card, Collapse, Descriptions, Flex, Table, Tag, Typography, theme } from 'antd'
import { CopyOutlined } from '@ant-design/icons'
import { caseBugReport } from '../../../../../../../lib/bug-report'
import type { TableColumnsType } from 'antd'
import { CaseStatusTag, ThenTag, utc } from '../../../../../../../components/status'
import type { CaseHistoryItem } from '../../../../../../../lib/types'
import { getCase } from '../../../../../../../server/fns'
import { PRODUCT_NAME } from '../../../../../../../components/brand'
import { UNGROUPED, caseMeta } from '../../../../../../../lib/organize'

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
    <ol style={{ margin: 0, paddingInlineStart: '1.25em' }}>
      {items.map((item, index) => <li key={index}>{item}</li>)}
    </ol>
  )
}

// One case answers: did it pass in the latest run, and if not, why? The written spec follows; the
// catalog's organizing fields and the raw error output wait in collapsed sections.
function CasePage() {
  const { token } = theme.useToken()
  const { project, check, spec, run, result, history, viewingLatest, deployed } = Route.useLoaderData()
  const { message } = App.useApp()
  const copyReport = async () => {
    const text = caseBugReport({
      origin: window.location.origin,
      project,
      check,
      run,
      deployed,
      spec,
      result,
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
  const thenStatus = new Map((result?.thens ?? []).map((then) => [then.id, then.status]))
  const meta = caseMeta(spec)
  const failed = result !== null && (result.status !== 'passed' || result.thens.some((then) => then.status === 'failed'))

  const more = [
    ...(result?.error ? [{
      key: 'error',
      label: 'Error output',
      children: <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{result.error}</pre>,
    }] : []),
    {
      key: 'details',
      label: 'Case details',
      children: (
        <Descriptions
          size="small"
          column={1}
          items={[
            { key: 'group', label: 'Group', children: meta.group ?? <Typography.Text type="secondary">{UNGROUPED}</Typography.Text> },
            {
              key: 'tags',
              label: 'Tags',
              children: meta.tags.length
                ? <Flex gap="small" wrap>{meta.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</Flex>
                : <Typography.Text type="secondary">—</Typography.Text>,
            },
            ...(spec.type ? [{ key: 'type', label: 'Type', children: spec.type.toUpperCase() }] : []),
            { key: 'policy', label: 'Runs', children: spec.run === 'manual' ? 'Only when named' : 'In every full run' },
            { key: 'status', label: 'Status', children: spec.status },
          ]}
        />
      ),
    },
  ]

  return (
    <Flex vertical gap="middle">
      <Breadcrumb
        items={[
          { title: <Link to="/p/$project" params={{ project: project.slug }}>{project.name}</Link> },
          { title: <Link to="/p/$project/checks/$check" params={{ project: project.slug, check: check.slug }} search={runSearch}>{check.name}</Link> },
          { title: spec.id },
        ]}
      />
      <Card
        title={`${spec.id} · ${spec.title}`}
        extra={result
          ? <CaseStatusTag status={failed && result.status === 'passed' ? 'failed' : result.status} />
          : <Tag>Not in this run</Tag>}
      >
        <Flex vertical gap="middle">
          <Flex gap="small" wrap>
            <Typography.Text type="secondary">
              {viewingLatest ? 'Latest run' : `Run #${run.id}`}, {utc(run.startedAt)}
              {!result
                ? ' · not in this run'
                : result.status !== 'passed' && result.thens.every((then) => then.status === 'not_run')
                  ? ' · stopped before its first check'
                  : ''}
            </Typography.Text>
            {!viewingLatest && (
              <Link to="/p/$project/checks/$check/cases/$case" params={{ project: project.slug, check: check.slug, case: spec.id }}>
                Back to latest
              </Link>
            )}
          </Flex>
          {failed && (
            <Flex>
              <Button type="primary" icon={<CopyOutlined />} onClick={copyReport}>Copy for a bug ticket</Button>
            </Flex>
          )}
          {spec.failure && (
            <Alert type={failed ? 'error' : 'info'} showIcon title="Known cause" description={spec.failure} />
          )}
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
                  <Flex vertical gap="small">
                    {spec.then.map((then) => (
                      <Flex key={then.id} gap="small" align="baseline">
                        <span style={{ flex: 'none' }}><ThenTag id={then.id} status={thenStatus.get(then.id) ?? 'not_run'} caseStatus={result?.status ?? 'missing'} /></span>
                        <Typography.Text>{then.expect}</Typography.Text>
                      </Flex>
                    ))}
                  </Flex>
                ),
              },
            ]}
          />
          <Collapse ghost size="small" items={more} />
        </Flex>
      </Card>
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
    { title: 'Run', key: 'run', render: (_, item) => <Typography.Text strong={item.run.id === shownId}>#{item.run.id}</Typography.Text> },
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
        ? <Typography.Text type="secondary">Not in this run</Typography.Text>
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
