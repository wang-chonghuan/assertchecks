import { Link, createFileRoute } from '@tanstack/react-router'
import { Breadcrumb, Card, Descriptions, Empty, Flex, Table, Tooltip, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import {
  Cell, CheckStatusTag, OutcomeTag, Sha, caseTone, duration, outcomeTone, utc,
} from '../../../../../../components/status'
import { getCheck } from '../../../../../../server/fns'
import type { MatrixRun, RunRow } from '../../../../../../lib/types'

export const Route = createFileRoute('/_app/p/$project/checks/$check/')({
  loader: ({ params }) => getCheck({ data: { project: params.project, check: params.check } }),
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.check.name ?? 'Check'} · assertchecks` }] }),
  component: CheckPage,
})

function CheckPage() {
  const { project, check, runs, matrix } = Route.useLoaderData()

  const runColumns: TableColumnsType<RunRow> = [
    {
      title: 'Run',
      dataIndex: 'id',
      render: (id: string) => <Link to="/p/$project/runs/$run" params={{ project: project.slug, run: id }}>#{id}</Link>,
    },
    { title: 'Outcome', key: 'outcome', render: (_, run) => <OutcomeTag run={run} /> },
    { title: 'Started', dataIndex: 'startedAt', render: utc },
    { title: 'Test SHA', dataIndex: 'testSha', render: (sha: string | null) => <Sha value={sha} /> },
    {
      title: 'Reason',
      dataIndex: 'reason',
      render: (reason: string | null) => reason ? <Typography.Text ellipsis={{ tooltip: reason }}>{reason}</Typography.Text> : '—',
      width: '40%',
    },
  ]

  const matrixColumns: TableColumnsType<{ id: string; title: string }> = [
    {
      title: 'Case',
      dataIndex: 'id',
      fixed: 'left',
      render: (id: string, item) => (
        <Tooltip title={item.title}>
          <Link to="/p/$project/checks/$check/cases/$case" params={{ project: project.slug, check: check.slug, case: id }}>
            {id}
          </Link>
        </Tooltip>
      ),
    },
    ...matrix.runs.map((run: MatrixRun) => ({
      title: (
        <Tooltip title={`Run ${run.id} · ${run.outcome} · ${utc(run.startedAt)}`}>
          <Link to="/p/$project/runs/$run" params={{ project: project.slug, run: run.id }}>
            <Cell tone={outcomeTone({ outcome: run.outcome, timedOut: false })} label={`Run ${run.id} ${run.outcome}`} />
          </Link>
        </Tooltip>
      ),
      key: run.id,
      align: 'center' as const,
      render: (_: unknown, item: { id: string }) => {
        const status = run.cases[item.id]
        return <Cell tone={caseTone(status)} label={`${item.id} in run ${run.id}: ${status ?? 'not in run'}`} />
      },
    })),
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
        <Descriptions
          size="small"
          column={{ xs: 1, sm: 1, md: 2, lg: 4, xl: 4, xxl: 4 }}
          items={[
            { key: 'env', label: 'Environment', children: check.environment },
            { key: 'schedule', label: 'Schedule', children: `every ${duration(check.periodSeconds)}` },
            { key: 'grace', label: 'Grace', children: duration(check.graceSeconds) },
            { key: 'next', label: 'Next expected', children: utc(check.nextExpectedAt) },
          ]}
        />
      </Card>
      <Card title={`Cases × last ${matrix.runs.length} finished runs`}>
        {matrix.cases.length === 0 ? (
          <Empty description="No case results yet." />
        ) : (
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            scroll={{ x: 'max-content' }}
            columns={matrixColumns}
            dataSource={matrix.cases}
          />
        )}
      </Card>
      <Card title="Run history">
        <Table
          rowKey="id"
          size="small"
          scroll={{ x: 'max-content' }}
          columns={runColumns}
          dataSource={runs}
          locale={{ emptyText: <Empty description="No runs yet." /> }}
        />
      </Card>
    </Flex>
  )
}
