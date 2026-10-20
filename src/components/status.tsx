import { Tag, Tooltip, Typography } from 'antd'
import type { CaseStatus, CheckStatus, Outcome, RunRow, ThenStatus } from '../lib/types'

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

// A Then that never executed is named by why: the case stopped before reaching it, the case was
// skipped, or the report never showed it. "Not run" alone read as if the case itself had not run.
function thenLabel(status: ThenStatus, caseStatus: CaseStatus): { color: string; label: string } {
  if (status === 'passed') return { color: 'success', label: 'Passed' }
  if (status === 'failed') return { color: 'error', label: 'Failed' }
  if (caseStatus === 'failed' || caseStatus === 'interrupted') return { color: 'default', label: 'Not reached' }
  if (caseStatus === 'skipped') return { color: 'default', label: 'Skipped' }
  return { color: 'default', label: 'Not reported' }
}

export function ThenTag({ id, status, caseStatus }: { id: string; status: ThenStatus; caseStatus: CaseStatus }) {
  const { color, label } = thenLabel(status, caseStatus)
  return <Tag color={color}>{id} · {label}</Tag>
}

// Why a catalog case is not in the automatic run: an orange draft, or a grey manual-only case.
// A failing case is never shown here; it runs and appears red among the cases that did not pass.
export function OutsideRunTag({ status, run }: { status: string; run: string }) {
  if (status === 'draft') return <Tag color="orange">Draft</Tag>
  if (run === 'manual') return <Tag>Manual only</Tag>
  return <Tag>{status} · {run}</Tag>
}
