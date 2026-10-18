import { Link, createFileRoute } from '@tanstack/react-router'
import { Breadcrumb, Card, Descriptions, Flex, Tag, Typography } from 'antd'
import { CaseStatusTag, OutcomeTag, ThenTag, utc } from '../../../../../../../components/status'
import { getCase } from '../../../../../../../server/fns'
import { PRODUCT_NAME } from '../../../../../../../components/brand'

export const Route = createFileRoute('/_app/p/$project/checks/$check/cases/$case')({
  loader: ({ params }) => getCase({ data: { project: params.project, check: params.check, case: params.case } }),
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

function CasePage() {
  const { project, check, spec, run, result } = Route.useLoaderData()
  const thenStatus = new Map((result?.thens ?? []).map((then) => [then.id, then.status]))

  return (
    <Flex vertical gap="middle">
      <Breadcrumb
        items={[
          { title: <Link to="/p/$project" params={{ project: project.slug }}>{project.name}</Link> },
          { title: <Link to="/p/$project/checks/$check" params={{ project: project.slug, check: check.slug }}>{check.name}</Link> },
          { title: spec.id },
        ]}
      />
      <Card
        title={`${spec.id} · ${spec.title}`}
        extra={<Flex gap="small">{spec.type && <Tag>{spec.type.toUpperCase()}</Tag>}<Tag>{spec.run}</Tag><Tag>{spec.status}</Tag></Flex>}
      >
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
                    <Flex key={then.id} gap="small" align="baseline" wrap>
                      <ThenTag id={then.id} status={thenStatus.get(then.id) ?? 'not_run'} />
                      <Typography.Text>{then.expect}</Typography.Text>
                    </Flex>
                  ))}
                </Flex>
              ),
            },
          ]}
        />
      </Card>
      <Card title="Result in the latest run">
        <Descriptions
          column={1}
          size="small"
          items={[
            {
              key: 'run',
              label: 'Latest run',
              children: (
                <Flex gap="small" align="center" wrap>
                  <OutcomeTag run={run} />
                  <Typography.Text>{utc(run.startedAt)}</Typography.Text>
                </Flex>
              ),
            },
            {
              key: 'case',
              label: 'This case',
              children: result
                ? <CaseStatusTag status={result.status} />
                : <Typography.Text type="secondary">Not reported in this run</Typography.Text>,
            },
            ...(result?.error
              ? [{
                  key: 'error',
                  label: 'Error',
                  children: <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{result.error}</pre>,
                }]
              : []),
          ]}
        />
      </Card>
    </Flex>
  )
}
