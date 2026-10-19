import { Alert, Flex, Typography, theme } from 'antd'
import { ActiveRunNotice, OutcomeTag, PartialRunNotice, duration, utc } from './status'
import type { CatalogChange, CheckCard } from '../lib/types'
import { ASSERTCHECKS_STYLE } from '../theme'

// The overview of one environment's latest results, shared by the project page cards, the check page
// and the homepage example, so all three always look the same. Three levels: the result (passed out of
// ran), the spread of the catalog (bar and legend), then when it ran and when it runs next.
export function CheckSummary({ check, compact = false }: { check: CheckCard; compact?: boolean }) {
  const { token } = theme.useToken()
  const { latest, counts } = check
  const ran = counts ? counts.passed + counts.failed : 0
  const segments = counts
    ? [
        { key: 'passed', label: 'passed', value: counts.passed, color: token.colorSuccess, always: true },
        { key: 'failed', label: 'failed', value: counts.failed, color: token.colorError, always: true },
        { key: 'draft', label: 'draft', value: counts.draft, color: token.orange, always: false },
        { key: 'manual', label: 'manual', value: counts.manual, color: token.colorTextQuaternary, always: false },
      ].filter((segment) => segment.always || segment.value > 0)
    : []
  // Only an unusual outcome needs its own tag; a plain pass or fail is already the card's status.
  const unusual = latest && (latest.timedOut || latest.outcome === 'incomplete')
  const small = { fontSize: token.fontSizeSM }
  const lead = { fontSize: token.fontSizeLG, lineHeight: token.lineHeightLG }
  // Vertical rhythm in grid units (4 px), independent of the compact algorithm's smaller margins.
  const unit = token.sizeUnit

  // One vertical rhythm on an 8 px grid: the headline, then the bar with its legend held close, then the
  // run times set apart under a rule.
  const notices = [
    <CatalogChangeNotice key="catalog" changes={check.catalogChanges} compact={compact} />,
    <ActiveRunNotice key="active" active={check.active} />,
    <PartialRunNotice key="partial" partial={check.partial} />,
  ]
  return (
    <Flex vertical>
      {(check.catalogChanges.length > 0 || check.active || check.partial) && (
        <Flex vertical gap={unit * 2} style={{ marginBottom: unit * 3 }}>{notices}</Flex>
      )}

      {latest && counts ? (
        <>
          <Flex align="baseline" justify="space-between" gap="small" wrap style={{ marginBottom: unit * 3 }}>
            <Flex align="baseline" gap={token.marginXS}>
              <span style={{ fontSize: token.fontSizeHeading2, fontWeight: token.fontWeightStrong, lineHeight: ASSERTCHECKS_STYLE.lineHeightSingle, color: token.colorText }}>
                {counts.passed}
              </span>
              <Typography.Text type="secondary" style={lead}>/ {ran} passed</Typography.Text>
            </Flex>
            <Flex align="center" gap="small">
              {unusual && <OutcomeTag run={latest} />}
              <Typography.Text type="secondary">{counts.total} cases</Typography.Text>
            </Flex>
          </Flex>

          <Flex role="img" aria-label={segments.map((segment) => `${segment.value} ${segment.label}`).join(', ')}
            gap={token.lineWidth * 2} style={{ height: unit * 2, marginBottom: unit * 2, borderRadius: token.borderRadiusLG, overflow: 'hidden', background: token.colorFillSecondary }}>
            {segments.filter((segment) => segment.value > 0).map((segment) => (
              <div key={segment.key} style={{ flex: segment.value, background: segment.color }} />
            ))}
          </Flex>

          <Flex wrap style={{ gap: `${token.marginXXS}px ${token.margin}px` }}>
            {segments.map((segment) => (
              <Flex key={segment.key} align="center" gap={token.marginXXS}>
                <span aria-hidden style={{ width: token.marginXS, height: token.marginXS, borderRadius: '50%', background: segment.color }} />
                <Typography.Text strong>{segment.value}</Typography.Text>
                <Typography.Text type="secondary">{segment.label}</Typography.Text>
              </Flex>
            ))}
          </Flex>

          {latest.reason && latest.outcome === 'incomplete' && (
            <Alert type="warning" showIcon title={latest.reason} style={{ marginTop: unit * 3 }} />
          )}
        </>
      ) : (
        <Typography.Text type="secondary" style={lead}>No runs yet</Typography.Text>
      )}

      <Flex
        vertical={compact}
        wrap
        justify="space-between"
        style={{
          gap: `${unit}px ${unit * 4}px`,
          marginTop: unit * 4,
          paddingTop: unit * 3,
          borderTop: `${token.lineWidth}px ${token.lineType} ${token.colorSplit}`,
        }}
      >
        {latest && (
          <Typography.Text type="secondary" style={small}>
            Last run {utc(latest.finishedAt)} · {latest.trigger === 'schedule' ? 'scheduled' : 'manual'}
          </Typography.Text>
        )}
        <Typography.Text type="secondary" style={small}>
          {check.periodSeconds === null
            ? 'Runs on demand'
            : `Every ${duration(check.periodSeconds)} · next ${utc(check.nextExpectedAt)}`}
        </Typography.Text>
      </Flex>
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
