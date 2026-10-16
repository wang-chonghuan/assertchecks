import { Link, createFileRoute } from '@tanstack/react-router'
import { Breadcrumb, Card, Descriptions, Empty, Flex, Table, Tag, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { CaseStatusTag, OutcomeTag, Sha, ThenTag, utc } from '../../../../../../../components/status'
import { getCase } from '../../../../../../../server/fns'
import type { CaseDetail } from '../../../../../../../lib/types'

export const Route = createFileRoute('/_app/p/$project/checks/$check/cases/$case')({
  loader: ({ params }) => getCase({ data: { project: params.project, check: params.check, case: params.case } }),
  head: ({ params }) => ({ meta: [{ title: `${params.case} · assertchecks` }] }),
  component: CasePage,
})

type HistoryRow = CaseDetail['history'][number]

function Steps({ items }: { items: string[] }) {
  return (
    <ol style={{ margin: 0, paddingInlineStart: '1.25em' }}>
      {items.map((item, index) => <li key={index}>{item}</li>)}
    </ol>
  )
}

function CasePage() {
  const { project, check, spec, catalogRunId, history } = Route.useLoaderData()
  const caseId = Route.useParams().case

  const columns: TableColumnsType<HistoryRow> = [
    {
      title: 'Run',
      key: 'run',
      render: (_, row) => (
        <Link to="/p/$project/runs/$run" params={{ project: project.slug, run: row.run.id }}>#{row.run.id}</Link>
      ),
    },
    { title: 'Started', key: 'started', render: (_, row) => utc(row.run.startedAt) },
    { title: 'Run outcome', key: 'outcome', render: (_, row) => <OutcomeTag run={row.run} /> },
    {
      title: 'Case',
      key: 'case',
      render: (_, row) => row.result
        ? <CaseStatusTag status={row.result.status} />
        : <Typography.Text type="secondary">Not in run</Typography.Text>,
    },
    {
      title: 'Then',
      key: 'then',
      render: (_, row) => (
        <Flex gap="small" wrap>
          {(row.result?.thens ?? []).map((then) => <ThenTag key={then.id} id={then.id} status={then.status} />)}
        </Flex>
      ),
    },
    { title: 'Test SHA', key: 'sha', render: (_, row) => <Sha value={row.run.testSha} /> },
  ]

  return (
    <Flex vertical gap="middle">
      <Breadcrumb
        items={[
          { title: <Link to="/p/$project" params={{ project: project.slug }}>{project.name}</Link> },
          { title: <Link to="/p/$project/checks/$check" params={{ project: project.slug, check: check.slug }}>{check.name}</Link> },
          { title: caseId },
        ]}
      />
      <Card
        title={spec ? `${spec.id} · ${spec.title}` : caseId}
        extra={spec && <Flex gap="small"><Tag>{spec.type.toUpperCase()}</Tag><Tag>{spec.run}</Tag><Tag>{spec.status}</Tag></Flex>}
      >
        {spec ? (
          <Descriptions
            column={1}
            bordered
            size="small"
            items={[
              { key: 'given', label: 'Given', children: <Steps items={spec.given} /> },
              { key: 'when', label: 'When', children: <Steps items={spec.when} /> },
              {
                key: 'then',
                label: 'Then',
                children: (
                  <Flex vertical gap="small">
                    {spec.then.map((then) => (
                      <div key={then.id}><Tag>{then.id}</Tag>{then.expect}</div>
                    ))}
                  </Flex>
                ),
              },
              {
                key: 'source',
                label: 'Specification from',
                children: catalogRunId
                  ? <Link to="/p/$project/runs/$run" params={{ project: project.slug, run: catalogRunId }}>catalog of run #{catalogRunId}</Link>
                  : '—',
              },
            ]}
          />
        ) : (
          <Empty description="No stored catalog declares this case." />
        )}
      </Card>
      <Card title="History">
        <Table
          rowKey={(row) => row.run.id}
          size="small"
          scroll={{ x: 'max-content' }}
          columns={columns}
          dataSource={history}
        />
      </Card>
    </Flex>
  )
}
