import { Alert, Tag, Tooltip, Typography, theme } from 'antd'
import type { CaseStatus, CheckStatus, Outcome, PartialRun, RunRow, ThenStatus } from '../lib/types'

// All timestamps are shown in UTC so server and client render identical text.
export function utc(iso: string | null): string {
  if (!iso) return '—'
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`
}

export function duration(seconds: number): string {
  if (seconds === 0) return 'none'
  if (seconds % 86400 === 0) return `${seconds / 86400}d`
  if (seconds % 3600 === 0) return `${seconds / 3600}h`
  if (seconds % 60 === 0) return `${seconds / 60}m`
  return `${seconds}s`
}

export function Sha({ value }: { value: string | null | undefined }) {
  if (!value) return <Typography.Text type="secondary">not recorded</Typography.Text>
  return (
    <Tooltip title={value}>
      <Typography.Text code copyable={{ text: value }}>{value.slice(0, 12)}</Typography.Text>
    </Tooltip>
  )
}

const CHECK: Record<CheckStatus, { color: string; label: string }> = {
  up: { color: 'success', label: 'Up' },
  failing: { color: 'error', label: 'Failing' },
  late: { color: 'warning', label: 'Late' },
  new: { color: 'default', label: 'New' },
}

export function CheckStatusTag({ status }: { status: CheckStatus }) {
  return <Tag color={CHECK[status].color}>{CHECK[status].label}</Tag>
}

const OUTCOME: Record<Outcome, { color: string; label: string }> = {
  passed: { color: 'success', label: 'Passed' },
  failed: { color: 'error', label: 'Failed' },
  incomplete: { color: 'warning', label: 'Incomplete' },
  running: { color: 'processing', label: 'Running' },
}

export function OutcomeTag({ run }: { run: Pick<RunRow, 'outcome' | 'timedOut'> }) {
  if (run.timedOut) return <Tag color="warning">Timed out</Tag>
  return <Tag color={OUTCOME[run.outcome].color}>{OUTCOME[run.outcome].label}</Tag>
}

const CASE: Record<CaseStatus, { color: string; label: string }> = {
  passed: { color: 'success', label: 'Passed' },
  failed: { color: 'error', label: 'Failed' },
  skipped: { color: 'warning', label: 'Skipped' },
  flaky: { color: 'warning', label: 'Flaky' },
  interrupted: { color: 'warning', label: 'Interrupted' },
  missing: { color: 'default', label: 'Missing' },
}

export function CaseStatusTag({ status }: { status: CaseStatus }) {
  return <Tag color={CASE[status].color}>{CASE[status].label}</Tag>
}

const THEN: Record<ThenStatus, { color: string; label: string }> = {
  passed: { color: 'success', label: 'Passed' },
  failed: { color: 'error', label: 'Failed' },
  not_run: { color: 'default', label: 'Not run' },
}

export function ThenTag({ id, status }: { id: string; status: ThenStatus }) {
  return <Tag color={THEN[status].color}>{id} · {THEN[status].label}</Tag>
}

// A run newer than the displayed one that has started but not reported yet.
export function ActiveRunNotice({ active }: { active: RunRow | null }) {
  const { token } = theme.useToken()
  if (!active) return null
  return (
    <Alert
      type={active.timedOut ? 'warning' : 'info'}
      showIcon
      title={active.timedOut
        ? `A newer run started at ${utc(active.startedAt)} timed out without reporting.`
        : `A newer run started at ${utc(active.startedAt)} is still running.`}
      style={{ marginBottom: token.margin }}
    />
  )
}

// A named-case run newer than the displayed full run; it never replaces the full run's result.
export function PartialRunNotice({ partial }: { partial: PartialRun | null }) {
  const { token } = theme.useToken()
  if (!partial) return null
  const cases = `${partial.caseCount} named case${partial.caseCount === 1 ? '' : 's'}`
  return (
    <Alert
      type={partial.outcome === 'passed' ? 'success' : partial.outcome === 'failed' ? 'error' : 'warning'}
      showIcon
      title={`A newer partial run of ${cases} finished at ${utc(partial.finishedAt)}: ${partial.outcome}.`}
      style={{ marginBottom: token.margin }}
    />
  )
}

// Why a catalog case is not in the automatic run: an orange draft, or a grey manual-only case.
// A failing case is never shown here; it runs and appears red among the cases that did not pass.
export function OutsideRunTag({ status, run }: { status: string; run: string }) {
  if (status === 'draft') return <Tag color="orange">Draft</Tag>
  if (run === 'manual') return <Tag>Manual only</Tag>
  return <Tag>{status} · {run}</Tag>
}
