import { Link, createFileRoute } from '@tanstack/react-router'
import { Card, Col, Empty, Flex, Row, Typography, theme } from 'antd'
import { CheckStatusTag } from '../../../../components/status'
import { CheckSummary } from '../../../../components/check-summary'
import { getOverview } from '../../../../server/fns'
import { PRODUCT_NAME } from '../../../../components/brand'

export const Route = createFileRoute('/_app/p/$project/')({
  loader: ({ params }) => getOverview({ data: { project: params.project } }),
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.project.name ?? 'Project'} · ${PRODUCT_NAME}` }] }),
  component: OverviewPage,
})

function OverviewPage() {
  const { project, checks } = Route.useLoaderData()
  const { token } = theme.useToken()

  return (
    <Flex vertical gap="middle">
      <Typography.Title level={2} style={{ margin: 0 }}>{project.name}</Typography.Title>
      {checks.length === 0 ? (
        <Card><Empty description="No checks in this project yet." /></Card>
      ) : (
        <Row gutter={[token.margin, token.margin]}>
          {checks.map((check) => (
            <Col key={check.slug} xs={24} md={12} xl={8}>
              <Card
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
      )}
    </Flex>
  )
}
