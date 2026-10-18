import { Alert, Col, Descriptions, Empty, Flex, Row, Statistic, Typography, theme } from 'antd'
import { ActiveRunNotice, OutcomeTag, PartialRunNotice, TriggerTag, scheduleText, utc } from './status'
import type { CatalogChange, CheckCard } from '../lib/types'

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
      <CatalogChangeNotice changes={check.catalogChanges} compact={compact} />
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

// On a card at most this many changes are listed; the check page lists them all.
const CARD_CHANGES = 3

function changeText(change: CatalogChange): string {
  if (change.change === 'removed') return 'removed from the catalog'
  return `now ${[change.status, change.run].filter(Boolean).join(' · ')}`
}

// Required cases the latest full run's catalog dropped. Only a notice: the run is judged as reported.
function CatalogChangeNotice({ changes, compact }: { changes: CatalogChange[]; compact: boolean }) {
  if (!changes.length) return null
  const shown = compact ? changes.slice(0, CARD_CHANGES) : changes
  return (
    <Alert
      type="warning"
      showIcon
      title={`Catalog changed: ${changes.length} required case${changes.length === 1 ? '' : 's'} no longer in the run`}
      description={
        <Flex vertical gap="small">
          {shown.map((change) => (
            <Typography.Text key={change.case}>
              <Typography.Text code>{change.case}</Typography.Text> {change.title} — {changeText(change)}
            </Typography.Text>
          ))}
          {changes.length > shown.length && (
            <Typography.Text type="secondary">and {changes.length - shown.length} more on the check page</Typography.Text>
          )}
          {!compact && (
            <Typography.Text type="secondary">Compared with the previous full run. The latest run is judged as reported.</Typography.Text>
          )}
        </Flex>
      }
    />
  )
}
