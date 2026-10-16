import assert from 'node:assert/strict'
import { test } from 'node:test'
import { containsSensitive, judge } from '../src/server/judge'
import { checkStatus, runTimedOut } from '../src/server/status'

const catalog = {
  version: 1,
  projects: ['dev'],
  cases: [
    { id: 'E2E-001', title: 'First', status: 'active', run: 'nightly', then: [{ id: 'A1' }, { id: 'A2' }] },
    { id: 'E2E-002', title: 'Second', status: 'active', run: 'nightly', then: [{ id: 'A1' }] },
    { id: 'E2E-003', title: 'Draft', status: 'draft', run: 'nightly', then: [{ id: 'A1' }] },
    { id: 'E2E-004', title: 'Manual', status: 'active', run: 'manual', then: [{ id: 'A1' }] },
  ],
}

type Spec = { id: string; status?: string; result?: string; thens?: Record<string, boolean>; error?: string }

function report(specs: Spec[], errors: unknown[] = []) {
  return {
    errors,
    suites: [{
      title: 'root',
      suites: specs.map((spec) => ({
        title: `${spec.id}.spec.ts`,
        specs: [{
          title: `${spec.id}: something`,
          tests: [{
            status: spec.status ?? 'expected',
            results: spec.status === 'skipped' ? [{ status: 'skipped', duration: 0, steps: [] }] : [{
              status: spec.result ?? 'passed',
              duration: 1234,
              error: spec.error ? { message: spec.error } : undefined,
              steps: [{
                title: 'fixture',
                steps: Object.entries(spec.thens ?? {}).map(([id, ok]) => ({
                  title: `Then ${id}: expectation`,
                  error: ok ? undefined : { message: 'boom' },
                })),
              }],
            }],
          }],
        }],
      })),
    }],
  }
}

const sha = { web: 'a'.repeat(40), api: 'b'.repeat(40) }
const base = { catalog, exitCode: 0, deployedStart: sha, deployedEnd: sha }
const allPassing: Spec[] = [
  { id: 'E2E-001', thens: { A1: true, A2: true } },
  { id: 'E2E-002', thens: { A1: true } },
]

test('passes only a complete green run of the active nightly set', () => {
  const verdict = judge({ ...base, report: report(allPassing) })
  assert.equal(verdict.outcome, 'passed')
  assert.equal(verdict.reason, null)
  assert.deepEqual(verdict.summary.map((item) => item.case), ['E2E-001', 'E2E-002'])
  assert.deepEqual(verdict.summary[0].thens, [{ id: 'A1', status: 'passed' }, { id: 'A2', status: 'passed' }])
})

test('an all-skipped run with exit code 0 is incomplete, not passed', () => {
  const verdict = judge({ ...base, report: report([{ id: 'E2E-001', status: 'skipped' }, { id: 'E2E-002', status: 'skipped' }]) })
  assert.equal(verdict.outcome, 'incomplete')
  assert.match(verdict.reason!, /E2E-001 skipped/)
})

test('a failed Then makes the run failed', () => {
  const verdict = judge({
    ...base,
    exitCode: 1,
    report: report([
      { id: 'E2E-001', status: 'unexpected', result: 'failed', thens: { A1: true, A2: false }, error: '\u001b[31mExpected 3\u001b[39m' },
      { id: 'E2E-002', thens: { A1: true } },
    ]),
  })
  assert.equal(verdict.outcome, 'failed')
  assert.equal(verdict.summary[0].thens[1].status, 'failed')
  assert.equal(verdict.summary[0].error, 'Expected 3')
})

test('a declared Then that never ran is incomplete', () => {
  const verdict = judge({ ...base, report: report([{ id: 'E2E-001', thens: { A1: true } }, { id: 'E2E-002', thens: { A1: true } }]) })
  assert.equal(verdict.outcome, 'incomplete')
  assert.equal(verdict.summary[0].thens[1].status, 'not_run')
})

test('missing and extra cases are incomplete', () => {
  const missing = judge({ ...base, report: report([allPassing[0]]) })
  assert.equal(missing.outcome, 'incomplete')
  assert.match(missing.reason!, /E2E-002 missing/)
  const extra = judge({ ...base, report: report([...allPassing, { id: 'E2E-003', thens: { A1: true } }]) })
  assert.equal(extra.outcome, 'incomplete')
  assert.match(extra.reason!, /E2E-003 is not in the active nightly set/)
})

test('a deployment change or unrecorded SHA during the run is incomplete', () => {
  const changed = judge({ ...base, deployedEnd: { ...sha, api: 'c'.repeat(40) }, report: report(allPassing) })
  assert.equal(changed.outcome, 'incomplete')
  assert.match(changed.reason!, /deployment changed/)
  const unrecorded = judge({ ...base, deployedStart: null, report: report(allPassing) })
  assert.equal(unrecorded.outcome, 'incomplete')
})

test('flaky, run-level errors, nonzero exit and unparseable reports are incomplete', () => {
  assert.equal(judge({ ...base, report: report([{ ...allPassing[0], status: 'flaky' }, allPassing[1]]) }).outcome, 'incomplete')
  assert.equal(judge({ ...base, report: report(allPassing, [{ message: 'config error' }]) }).outcome, 'incomplete')
  assert.equal(judge({ ...base, exitCode: 1, report: report(allPassing) }).outcome, 'incomplete')
  assert.equal(judge({ ...base, report: { nope: true } }).outcome, 'incomplete')
  assert.equal(judge({ ...base, catalog: {}, report: report(allPassing) }).outcome, 'incomplete')
})

test('sensitive patterns are detected', () => {
  assert.equal(containsSensitive('{"Authorization":"x"}'), true)
  assert.equal(containsSensitive('header Bearer abc'), true)
  assert.equal(containsSensitive('eyJhbGciOiJI.eyJzdWIiOiIx.sig'), true)
  assert.equal(containsSensitive('Then A1: authorization regression is blocked'), false)
})

test('check status is derived from the last finished run, period and grace', () => {
  const finishedAt = new Date('2026-10-16T03:10:00Z')
  const input = { periodSeconds: 86400, graceSeconds: 7200 }
  assert.equal(checkStatus({ ...input, now: finishedAt, lastFinished: null }).status, 'new')
  assert.equal(checkStatus({ ...input, now: new Date('2026-10-17T05:10:00Z'), lastFinished: { outcome: 'passed', finishedAt } }).status, 'up')
  assert.equal(checkStatus({ ...input, now: new Date('2026-10-17T05:10:01Z'), lastFinished: { outcome: 'passed', finishedAt } }).status, 'late')
  assert.equal(checkStatus({ ...input, now: finishedAt, lastFinished: { outcome: 'incomplete', finishedAt } }).status, 'failing')
  assert.equal(
    checkStatus({ ...input, now: finishedAt, lastFinished: { outcome: 'passed', finishedAt } }).nextExpectedAt?.toISOString(),
    '2026-10-17T03:10:00.000Z',
  )
})

test('a running run times out after the grace period', () => {
  const startedAt = new Date('2026-10-16T03:00:00Z')
  assert.equal(runTimedOut({ now: new Date('2026-10-16T05:00:00Z'), startedAt, graceSeconds: 7200, outcome: 'running' }), false)
  assert.equal(runTimedOut({ now: new Date('2026-10-16T05:00:01Z'), startedAt, graceSeconds: 7200, outcome: 'running' }), true)
  assert.equal(runTimedOut({ now: new Date('2026-10-16T05:00:01Z'), startedAt, graceSeconds: 7200, outcome: 'passed' }), false)
})
