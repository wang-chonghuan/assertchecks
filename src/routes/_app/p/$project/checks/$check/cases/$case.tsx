import { Link, createFileRoute } from '@tanstack/react-router'
import { Alert, Breadcrumb, Card, Collapse, Descriptions, Flex, Tag, Typography, theme } from 'antd'
import { CaseStatusTag, ThenTag, utc } from '../../../../../../../components/status'
import { getCase } from '../../../../../../../server/fns'
import { PRODUCT_NAME } from '../../../../../../../components/brand'
import { UNGROUPED, caseMeta } from '../../../../../../../lib/organize'

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

// One case answers: did it pass in the latest run, and if not, why? The written spec follows; the
// catalog's organizing fields and the raw error output wait in collapsed sections.
function CasePage() {
  const { token } = theme.useToken()
  const { project, check, spec, run, result } = Route.useLoaderData()
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
          { title: <Link to="/p/$project/checks/$check" params={{ project: project.slug, check: check.slug }}>{check.name}</Link> },
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
          <Typography.Text type="secondary">
            {!result
              ? `Not reported in the latest run (${utc(run.startedAt)})`
              : result.status !== 'passed' && result.thens.every((then) => then.status === 'not_run')
                ? `Latest run ${utc(run.startedAt)} · stopped before its first check`
                : `Latest run ${utc(run.startedAt)}`}
          </Typography.Text>
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
    </Flex>
  )
}
