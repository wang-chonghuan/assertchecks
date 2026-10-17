import { Alert, Col, Descriptions, Empty, Flex, Row, Statistic, Typography, theme } from 'antd'
import { ActiveRunNotice, OutcomeTag, PartialRunNotice, TriggerTag, scheduleText, utc } from './status'
import type { CheckCard } from '../lib/types'

// The overview of one environment's latest results, shared by the project page cards and the
// check page so both always show the same numbers.
export function CheckSummary({ check, compact = false }: { check: CheckCard; compact?: boolean }) {
  const { token } = theme.useToken()
  const { latest, counts } = check
  const stats = counts
    ? [
        { key: 'total', title: 'Total cases', value: counts.total },
        { key: 'passed', title: 'Passed', value: counts.passed, color: token.colorSuccess },
        { key: 'failed', title: 'Failed', value: counts.failed, color: counts.failed ? token.colorError : undefined },
        { key: 'draft', title: 'Draft', value: counts.draft, color: counts.draft ? token.orange : undefined },
        { key: 'manual', title: 'Manual', value: counts.manual },
      ]
    : []

  return (
    <Flex vertical gap="middle">
      <ActiveRunNotice active={check.active} />
      <PartialRunNotice partial={check.partial} />
      {latest ? (
        <>
          <Flex gap="small" align="center" wrap>
            <Typography.Text type="secondary">Last run</Typography.Text>
            <Typography.Text strong>{utc(latest.finishedAt)}</Typography.Text>
            <OutcomeTag run={latest} />
            <TriggerTag trigger={latest.trigger} />
          </Flex>
          <Row gutter={[token.margin, token.margin]}>
            {stats.map((item) => (
              <Col key={item.key} xs={12} sm={8} md={compact ? 8 : 4}>
                <Statistic title={item.title} value={item.value} styles={{ content: item.color ? { color: item.color } : undefined }} />
              </Col>
            ))}
          </Row>
          {/* Failed cases are listed on the check page; only an incomplete run needs its reason here. */}
          {latest.reason && latest.outcome === 'incomplete' && (
            <Alert type="warning" showIcon title={latest.reason} />
          )}
        </>
      ) : (
        <Empty description="No finished runs yet." />
      )}
      <Descriptions
        size="small"
        column={{ xs: 1, sm: 1, md: compact ? 1 : 2, lg: compact ? 1 : 2, xl: compact ? 1 : 2, xxl: compact ? 1 : 2 }}
        items={[
          { key: 'schedule', label: 'Schedule', children: scheduleText(check.periodSeconds, check.graceSeconds) },
          { key: 'next', label: 'Next expected', children: utc(check.nextExpectedAt) },
        ]}
      />
    </Flex>
  )
}
