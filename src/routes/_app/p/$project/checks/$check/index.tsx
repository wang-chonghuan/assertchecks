import { Link, createFileRoute } from '@tanstack/react-router'
import { Alert, Breadcrumb, Card, Descriptions, Empty, Flex, Table, Typography, theme } from 'antd'
import type { TableColumnsType } from 'antd'
import { ExportOutlined } from '@ant-design/icons'
import {
  ActiveRunNotice, CaseStatusTag, CheckStatusTag, OutcomeTag, Sha, ThenTag, duration, utc,
} from '../../../../../../components/status'
import { getCheck } from '../../../../../../server/fns'
import type { CaseResult } from '../../../../../../lib/types'
import { PRODUCT_NAME } from '../../../../../../components/brand'

export const Route = createFileRoute('/_app/p/$project/checks/$check/')({
  loader: ({ params }) => getCheck({ data: { project: params.project, check: params.check } }),
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.check.name ?? 'Check'} · ${PRODUCT_NAME}` }] }),
  component: CheckPage,
})

function CheckPage() {
  const { project, check, latest } = Route.useLoaderData()
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
          <Typography.Text type="secondary">{item.title.replace(/^[A-Z0-9-]+:\s*/, '')}</Typography.Text>
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
          { title: check.name },
        ]}
      />
      <Card title={check.name} extra={<CheckStatusTag status={check.status} />}>
        <ActiveRunNotice active={check.active} />
        {latest?.reason && (
          <Alert
            type={latest.outcome === 'failed' ? 'error' : 'warning'}
            showIcon
            title={latest.reason}
            style={{ marginBottom: token.margin }}
          />
        )}
        <Descriptions
          size="small"
          column={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2, xxl: 2 }}
          items={[
            { key: 'env', label: 'Environment', children: check.environment },
            {
              key: 'schedule',
              label: 'Schedule',
              children: `every ${duration(check.periodSeconds)}, grace ${duration(check.graceSeconds)}`,
            },
            { key: 'next', label: 'Next expected', children: utc(check.nextExpectedAt) },
            ...(latest
              ? [
                  { key: 'outcome', label: 'Latest run', children: <OutcomeTag run={latest} /> },
                  { key: 'started', label: 'Started', children: utc(latest.startedAt) },
                  { key: 'finished', label: 'Finished', children: utc(latest.finishedAt) },
                  { key: 'exit', label: 'Exit code', children: latest.exitCode ?? '—' },
                  { key: 'test', label: 'Test SHA', children: <Sha value={latest.testSha} /> },
                  {
                    key: 'runner',
                    label: 'Runner',
                    children: latest.runUrl ? (
                      <Typography.Link href={latest.runUrl} target="_blank" rel="noreferrer">
                        {latest.runnerKind ?? 'Open run'} <ExportOutlined />
                      </Typography.Link>
                    ) : (latest.runnerKind ?? '—'),
                  },
                  { key: 'webStart', label: 'Web SHA at start', children: <Sha value={latest.deployedStart?.web} /> },
                  { key: 'webEnd', label: 'Web SHA at end', children: <Sha value={latest.deployedEnd?.web} /> },
                  { key: 'apiStart', label: 'API SHA at start', children: <Sha value={latest.deployedStart?.api} /> },
                  { key: 'apiEnd', label: 'API SHA at end', children: <Sha value={latest.deployedEnd?.api} /> },
                ]
              : []),
          ]}
        />
      </Card>
      <Card title="Cases in the latest run">
        {!latest ? (
          <Empty description="No finished runs yet." />
        ) : latest.summary === null ? (
          <Empty description="No case results were stored for this run." />
        ) : (
          <Table
            rowKey="case"
            size="small"
            pagination={false}
            scroll={{ x: 'max-content' }}
            columns={columns}
            dataSource={latest.summary}
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
