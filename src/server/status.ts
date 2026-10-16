// Check state is derived on read from the latest finished run; it is never stored.

export type CheckStatus = 'new' | 'up' | 'failing' | 'late'

export function checkStatus(input: {
  now: Date
  periodSeconds: number
  graceSeconds: number
  lastFinished: { outcome: string; finishedAt: Date } | null
}): { status: CheckStatus; nextExpectedAt: Date | null } {
  const { lastFinished } = input
  if (!lastFinished) return { status: 'new', nextExpectedAt: null }
  const nextExpectedAt = new Date(lastFinished.finishedAt.getTime() + input.periodSeconds * 1000)
  const deadline = nextExpectedAt.getTime() + input.graceSeconds * 1000
  if (input.now.getTime() > deadline) return { status: 'late', nextExpectedAt }
  return { status: lastFinished.outcome === 'passed' ? 'up' : 'failing', nextExpectedAt }
}

export function runTimedOut(input: { now: Date; startedAt: Date; graceSeconds: number; outcome: string }): boolean {
  return input.outcome === 'running' && input.now.getTime() > input.startedAt.getTime() + input.graceSeconds * 1000
}
