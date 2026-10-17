import { Link, createFileRoute } from '@tanstack/react-router'
import { Card, Col, Descriptions, Empty, Flex, Row, Typography, theme } from 'antd'
import { ActiveRunNotice, CheckStatusTag, OutcomeTag, duration, utc } from '../../../../components/status'
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
                <ActiveRunNotice active={check.active} />
                <Descriptions
                  column={1}
                  size="small"
                  items={[
                    { key: 'env', label: 'Environment', children: check.environment },
                    {
                      key: 'last',
                      label: 'Latest run',
                      children: check.latest ? (
                        <Flex gap="small" align="center" wrap>
                          <OutcomeTag run={check.latest} />
                          <Typography.Text>{utc(check.latest.startedAt)}</Typography.Text>
                        </Flex>
                      ) : (
                        <Typography.Text type="secondary">No finished runs yet</Typography.Text>
                      ),
                    },
                    { key: 'next', label: 'Next expected', children: utc(check.nextExpectedAt) },
                    {
                      key: 'schedule',
                      label: 'Schedule',
                      children: `every ${duration(check.periodSeconds)}, grace ${duration(check.graceSeconds)}`,
                    },
                  ]}
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Flex>
  )
}
