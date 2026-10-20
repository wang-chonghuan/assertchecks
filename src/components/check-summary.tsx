import { Alert, Descriptions, Flex, Popover, Typography, theme } from 'antd'
import { InfoCircleOutlined, LoadingOutlined } from '@ant-design/icons'
import { OutcomeTag, duration, utc } from './status'
import type { CatalogChange, CheckCard } from '../lib/types'
import { ASSERTCHECKS_STYLE } from '../theme'

// The overview of one environment's latest run, shared by the project page cards, the check page and
// the homepage example, so all three always look the same. It answers one question: of the cases that
// ran, how many failed? Everything else about the run sits behind the info popover.
export function CheckSummary({ check, compact = false }: { check: CheckCard; compact?: boolean }) {
  const { token } = theme.useToken()
  const { latest, counts } = check
  const ran = counts ? counts.passed + counts.failed + counts.notRun : 0
  // Only the cases that ran; draft and manual cases are outside the run and stay in the popover.
  const segments = counts
    ? [
        { key: 'passed', label: 'passed', value: counts.passed, color: token.colorSuccess },
        { key: 'failed', label: 'failed', value: counts.failed, color: token.colorError },
        // Ran but gave no full verdict: cut off, skipped, flaky, or a Then missing from the report.
        { key: 'notRun', label: 'incomplete', value: counts.notRun, color: token.colorWarning },
      ]
    : []
  // The headline is the failures when there are any, otherwise the passes; the legend adds only what
  // the headline does not already say.
  const headline = counts && counts.failed > 0 ? segments[1] : segments[0]
  const legend = segments.filter((segment) => segment !== headline && segment.value > 0)
  // Only an unusual outcome needs its own tag; a plain pass or fail is already the card's status.
  const unusual = latest && (latest.timedOut || latest.outcome === 'incomplete')
  const small = { fontSize: token.fontSizeSM, lineHeight: token.lineHeightSM }
  const lead = { fontSize: token.fontSizeLG, lineHeight: token.lineHeightLG }
  // Vertical rhythm in grid units (4 px), independent of the compact algorithm's smaller margins.
  const unit = token.sizeUnit

  return (
    <Flex vertical>
      {(check.catalogChanges.length > 0 || check.active) && (
        <Flex vertical gap={unit * 2} style={{ marginBottom: unit * 3 }}>
          {check.active && (
            <Typography.Text type={check.active.timedOut ? 'warning' : 'secondary'} style={small}>
              {check.active.timedOut
                ? `A newer run started ${utc(check.active.startedAt)} and timed out without reporting.`
                : <><LoadingOutlined /> A newer run started {utc(check.active.startedAt)} and is still running.</>}
            </Typography.Text>
          )}
          <CatalogChangeNotice changes={check.catalogChanges} compact={compact} />
        </Flex>
      )}

      {latest && counts && headline ? (
        <>
          <Flex align="baseline" justify="space-between" gap="small" wrap style={{ marginBottom: unit * 3 }}>
            <Flex align="baseline" gap={token.marginXS}>
              <span style={{ fontSize: token.fontSizeHeading2, fontWeight: token.fontWeightStrong, lineHeight: ASSERTCHECKS_STYLE.lineHeightSingle, color: counts.failed > 0 ? token.colorError : token.colorText }}>
                {headline.value}
              </span>
              {/* The subject is cases, never runs: "19 failed of 160 cases tested", or "160 cases passed". */}
              {counts.passed === ran ? (
                <Typography.Text style={lead}>{ran === 1 ? 'case' : 'cases'} passed</Typography.Text>
              ) : (
                <>
                  <Typography.Text style={lead}>{headline.label}</Typography.Text>
                  <Typography.Text type="secondary" style={lead}>of {ran} {ran === 1 ? 'case' : 'cases'} tested</Typography.Text>
                </>
              )}
            </Flex>
            {unusual && <OutcomeTag run={latest} />}
          </Flex>

          <Flex role="img" aria-label={segments.map((segment) => `${segment.value} ${segment.label}`).join(', ')}
            gap={token.lineWidth * 2} style={{ height: unit * 2, borderRadius: token.borderRadiusLG, overflow: 'hidden', background: token.colorFillSecondary }}>
            {segments.filter((segment) => segment.value > 0).map((segment) => (
              <div key={segment.key} style={{ flex: segment.value, background: segment.color }} />
            ))}
          </Flex>

          {legend.length > 0 && (
            <Flex wrap style={{ gap: `${token.marginXXS}px ${token.margin}px`, marginTop: unit * 2 }}>
              {legend.map((segment) => (
                <Flex key={segment.key} align="center" gap={token.marginXXS}>
                  <span aria-hidden style={{ width: token.marginXS, height: token.marginXS, borderRadius: '50%', background: segment.color }} />
                  <Typography.Text strong>{segment.value}</Typography.Text>
                  <Typography.Text type="secondary">{segment.label}</Typography.Text>
                </Flex>
              ))}
            </Flex>
          )}

          {latest.reason && latest.outcome === 'incomplete' && (
            <Alert type="warning" showIcon title={latest.reason} style={{ marginTop: unit * 3 }} />
          )}
        </>
      ) : (
        <Typography.Text type="secondary" style={lead}>No runs yet</Typography.Text>
      )}

      <Flex
        align="center"
        gap={token.marginXXS}
        style={{
          marginTop: unit * 4,
          paddingTop: unit * 3,
          borderTop: `${token.lineWidth}px ${token.lineType} ${token.colorSplit}`,
        }}
      >
        <Typography.Text type="secondary" style={small}>
          {latest ? `Ran ${utc(latest.finishedAt)}` : schedule(check)}
        </Typography.Text>
        {latest && (
          <Popover
            title="About this run"
            // Clicks inside the popover must not reach a clickable card around the summary.
            content={<div onClick={(event) => event.stopPropagation()}><RunInfo check={check} /></div>}
            trigger={['hover', 'click']}
          >
            <Typography.Text type="secondary" style={small} aria-label="About this run" role="button" tabIndex={0}
              onClick={(event) => event.stopPropagation()}>
              <InfoCircleOutlined />
            </Typography.Text>
          </Popover>
        )}
      </Flex>
    </Flex>
  )
}

function schedule(check: CheckCard): string {
  return check.periodSeconds === null
    ? 'Runs on demand'
    : `Every ${duration(check.periodSeconds)} · next ${utc(check.nextExpectedAt)}`
}

// What a reader rarely needs but sometimes asks: how the run was triggered, when the next one is due,
// a newer named-case run, and the catalog cases this run left out by design.
function RunInfo({ check }: { check: CheckCard }) {
  const { token } = theme.useToken()
  const { latest, partial, counts } = check
  const outside = counts ? [
    counts.draft ? `${counts.draft} draft` : null,
    counts.manual ? `${counts.manual} manual` : null,
  ].filter(Boolean).join(', ') : ''
  return (
    <Descriptions
      size="small"
      column={1}
      style={{ maxWidth: token.controlHeight * 10 }}
      items={[
        { key: 'trigger', label: 'Started', children: latest?.trigger === 'schedule' ? 'On schedule' : 'Manually' },
        { key: 'schedule', label: 'Schedule', children: schedule(check) },
        ...(partial ? [{
          key: 'partial',
          label: 'Later run',
          children: `${partial.caseCount} named case${partial.caseCount === 1 ? '' : 's'}, ${utc(partial.finishedAt)}: ${partial.outcome}. Shown as a notice; it does not change this result.`,
        }] : []),
        ...(outside ? [{ key: 'outside', label: 'Not in the run', children: `${outside} (of ${counts!.total} catalog cases)` }] : []),
      ]}
    />
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
      title={`${changes.length} required case${changes.length === 1 ? '' : 's'} left the run since the previous one`}
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
        </Flex>
      }
    />
  )
}
