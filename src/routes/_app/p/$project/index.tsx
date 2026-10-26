import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Card, Col, Empty, Flex, Row, Tabs } from 'antd'
import { CheckStatusTag } from '../../../../components/status'
import { CheckSummary } from '../../../../components/check-summary'
import { ProductionErrorsTab } from '../../../../components/production-errors'
import { getOverview } from '../../../../server/fns'
import { PRODUCT_NAME } from '../../../../components/brand'
import { space } from '../../../../infui/tokens'

export const Route = createFileRoute('/_app/p/$project/')({
  // ?tab=errors opens Production errors; Tests is the default tab.
  validateSearch: (search: Record<string, unknown>): { tab?: 'errors' } => (search.tab === 'errors' ? { tab: 'errors' } : {}),
  loader: ({ params }) => getOverview({ data: { project: params.project } }),
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.project.name ?? 'Project'} · ${PRODUCT_NAME}` }] }),
  component: OverviewPage,
})

function OverviewPage() {
  const { project, checks } = Route.useLoaderData()
  const { tab } = Route.useSearch()
  const navigate = useNavigate()

  const cards = checks.length === 0 ? (
    <Card><Empty description="No checks in this project yet." /></Card>
  ) : (
    <Row gutter={[space.group, space.group]}>
      {checks.map((check) => (
        <Col key={check.slug} xs={24} md={12} xl={8}>
          <Card
            hoverable
            // The whole card opens the check; the title link keeps it reachable by keyboard.
            onClick={() => navigate({ to: '/p/$project/checks/$check', params: { project: project.slug, check: check.slug } })}
            style={{ height: '100%', cursor: 'pointer' }}
            // The header has no rule, so the body starts close under the title.
            styles={{ body: { paddingTop: space.inline } }}
            title={
              <Link to="/p/$project/checks/$check" params={{ project: project.slug, check: check.slug }}>
                {check.name}
              </Link>
            }
            extra={<CheckStatusTag status={check.status} />}
          >
            <CheckSummary check={check} compact />
          </Card>
        </Col>
      ))}
    </Row>
  )
  const tests = cards

  return (
    <Flex vertical gap={space.group}>
      <Tabs
        activeKey={tab ?? 'tests'}
        onChange={(key) => navigate({ to: '/p/$project', params: { project: project.slug }, search: key === 'errors' ? { tab: 'errors' } : {} })}
        items={[
          { key: 'tests', label: 'Tests', children: tests },
          // Rendered once opened, so the project page reads production telemetry only when asked.
          { key: 'errors', label: 'Production errors', children: <ProductionErrorsTab key={project.slug} project={project.slug} /> },
        ]}
      />
    </Flex>
  )
}
