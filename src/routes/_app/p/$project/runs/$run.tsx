import { Link, createFileRoute } from '@tanstack/react-router'
import { Alert, Breadcrumb, Card, Descriptions, Empty, Flex, Table, Typography, theme } from 'antd'
import type { TableColumnsType } from 'antd'
import { ExportOutlined } from '@ant-design/icons'
import { CaseStatusTag, OutcomeTag, Sha, ThenTag, utc } from '../../../../../components/status'
import { getRun } from '../../../../../server/fns'
import type { CaseResult } from '../../../../../lib/types'

export const Route = createFileRoute('/_app/p/$project/runs/$run')({
  loader: ({ params }) => getRun({ data: { project: params.project, run: params.run } }),
  head: ({ loaderData }) => ({ meta: [{ title: `Run ${loaderData?.run.id ?? ''} · assertchecks` }] }),
  component: RunPage,
})

function RunPage() {
  const { project, check, run } = Route.useLoaderData()
  const { token } = theme.useToken()

  const columns: TableColumnsType<CaseResult> = [
    {
      title: 'Case',
      dataIndex: 'case',
      render: (id: string, item) => (
        <Flex vertical>
          <Link to="/p/$project/checks/$check/cases/$case" params={{ project: project.slug, check: check.slug, case: id }}>
            {id}
          </Link>
          <Typography.Text type="secondary">{item.title.replace(/^[^:]+:\s*/, '')}</Typography.Text>
        </Flex>
      ),
    },
    { title: 'Status', dataIndex: 'status', render: (status: CaseResult['status']) => <CaseStatusTag status={status} /> },
    {
      title: 'Then',
      dataIndex: 'thens',
      render: (thens: CaseResult['thens']) => (
        <Flex gap="small" wrap>{thens.map((then) => <ThenTag key={then.id} id={then.id} status={then.status} />)}</Flex>
      ),
    },
    { title: 'Duration', dataIndex: 'ms', render: (ms: number | null) => (ms === null ? '—' : `${(ms / 1000).toFixed(1)}s`) },
  ]

  return (
    <Flex vertical gap="middle">
      <Breadcrumb
        items={[
          { title: <Link to="/p/$project" params={{ project: project.slug }}>{project.name}</Link> },
          { title: <Link to="/p/$project/checks/$check" params={{ project: project.slug, check: check.slug }}>{check.name}</Link> },
          { title: `Run #${run.id}` },
        ]}
      />
      <Card title={`Run #${run.id}`} extra={<OutcomeTag run={run} />}>
        {run.reason && (
          <Alert
            type={run.outcome === 'failed' ? 'error' : 'warning'}
            showIcon
            title={run.reason}
            style={{ marginBottom: token.margin }}
          />
        )}
        <Descriptions
          size="small"
          column={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2, xxl: 2 }}
          items={[
            { key: 'env', label: 'Environment', children: check.environment },
            { key: 'exit', label: 'Exit code', children: run.exitCode ?? '—' },
            { key: 'started', label: 'Started', children: utc(run.startedAt) },
            { key: 'finished', label: 'Finished', children: utc(run.finishedAt) },
            { key: 'test', label: 'Test SHA', children: <Sha value={run.testSha} /> },
            {
              key: 'runner',
              label: 'Runner',
              children: run.runUrl ? (
                <Typography.Link href={run.runUrl} target="_blank" rel="noreferrer">
                  {run.runnerKind ?? 'Open run'} <ExportOutlined />
                </Typography.Link>
              ) : (run.runnerKind ?? '—'),
            },
            { key: 'webStart', label: 'Web SHA at start', children: <Sha value={run.deployedStart?.web} /> },
            { key: 'webEnd', label: 'Web SHA at end', children: <Sha value={run.deployedEnd?.web} /> },
            { key: 'apiStart', label: 'API SHA at start', children: <Sha value={run.deployedStart?.api} /> },
            { key: 'apiEnd', label: 'API SHA at end', children: <Sha value={run.deployedEnd?.api} /> },
          ]}
        />
      </Card>
      <Card title="Cases">
        {run.summary === null ? (
          <Empty description={run.outcome === 'running' ? 'The run has not reported yet.' : 'No case results were stored for this run.'} />
        ) : (
          <Table
            rowKey="case"
            size="small"
            pagination={false}
            scroll={{ x: 'max-content' }}
            columns={columns}
            dataSource={run.summary}
            expandable={{
              rowExpandable: (item) => Boolean(item.error),
              expandedRowRender: (item) => (
                <Typography.Paragraph>
                  <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{item.error}</pre>
                </Typography.Paragraph>
              ),
            }}
          />
        )}
      </Card>
    </Flex>
  )
}
