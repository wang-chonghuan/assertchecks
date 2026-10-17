// Check state is derived on read; it is never stored.
// Status follows the latest finished full run of any trigger. Lateness applies only to checks with a
// period and is measured from the latest finished scheduled full run (or the check's creation), so
// manual runs can never hide a missing scheduled run.

export type CheckStatus = 'new' | 'up' | 'failing' | 'late'

export function checkStatus(input: {
  now: Date
  createdAt: Date
  periodSeconds: number | null
  graceSeconds: number
  latestFull: { outcome: string } | null
  latestScheduled: { finishedAt: Date } | null
}): { status: CheckStatus; nextExpectedAt: Date | null } {
  let nextExpectedAt: Date | null = null
  if (input.periodSeconds !== null) {
    const anchor = input.latestScheduled?.finishedAt ?? input.createdAt
    nextExpectedAt = new Date(anchor.getTime() + input.periodSeconds * 1000)
    if (input.now.getTime() > nextExpectedAt.getTime() + input.graceSeconds * 1000) {
      return { status: 'late', nextExpectedAt }
    }
  }
  if (!input.latestFull) return { status: 'new', nextExpectedAt }
  return { status: input.latestFull.outcome === 'passed' ? 'up' : 'failing', nextExpectedAt }
}

export function runTimedOut(input: { now: Date; startedAt: Date; graceSeconds: number; outcome: string }): boolean {
  return input.outcome === 'running' && input.now.getTime() > input.startedAt.getTime() + input.graceSeconds * 1000
}
