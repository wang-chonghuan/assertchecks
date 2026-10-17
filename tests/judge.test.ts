import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEFAULT_SELECTION, containsSensitive, judge } from '../src/server/judge'
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

function playwright(specs: Spec[], errors: unknown[] = []) {
  return {
    format: 'playwright',
    report: {
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
    },
  }
}

const sha = { web: 'a'.repeat(40), api: 'b'.repeat(40) }
const base = { catalog, exitCode: 0, deployedStart: sha, deployedEnd: sha, selection: DEFAULT_SELECTION, cases: null }
const allPassing: Spec[] = [
  { id: 'E2E-001', thens: { A1: true, A2: true } },
  { id: 'E2E-002', thens: { A1: true } },
]

test('passes only a complete green run of the selected cases', () => {
  const verdict = judge({ ...base, result: playwright(allPassing) })
  assert.equal(verdict.outcome, 'passed')
  assert.equal(verdict.reason, null)
  assert.deepEqual(verdict.summary.map((item) => item.case), ['E2E-001', 'E2E-002'])
  assert.deepEqual(verdict.summary[0].thens, [{ id: 'A1', status: 'passed' }, { id: 'A2', status: 'passed' }])
  assert.equal(verdict.summary[0].title, 'First')
})

test('an all-skipped run with exit code 0 is incomplete, not passed', () => {
  const verdict = judge({ ...base, result: playwright([{ id: 'E2E-001', status: 'skipped' }, { id: 'E2E-002', status: 'skipped' }]) })
  assert.equal(verdict.outcome, 'incomplete')
  assert.match(verdict.reason!, /E2E-001 skipped/)
})

test('a failed Then makes the run failed', () => {
  const verdict = judge({
    ...base,
    exitCode: 1,
    result: playwright([
      { id: 'E2E-001', status: 'unexpected', result: 'failed', thens: { A1: true, A2: false }, error: '\u001b[31mExpected 3\u001b[39m' },
      { id: 'E2E-002', thens: { A1: true } },
    ]),
  })
  assert.equal(verdict.outcome, 'failed')
  assert.equal(verdict.summary[0].thens[1].status, 'failed')
  assert.equal(verdict.summary[0].error, 'Expected 3')
})

test('a declared Then that never ran is incomplete', () => {
  const verdict = judge({ ...base, result: playwright([{ id: 'E2E-001', thens: { A1: true } }, { id: 'E2E-002', thens: { A1: true } }]) })
  assert.equal(verdict.outcome, 'incomplete')
  assert.equal(verdict.summary[0].thens[1].status, 'not_run')
})

test('missing and extra cases are incomplete', () => {
  const missing = judge({ ...base, result: playwright([allPassing[0]]) })
  assert.equal(missing.outcome, 'incomplete')
  assert.match(missing.reason!, /E2E-002 missing/)
  const extra = judge({ ...base, result: playwright([...allPassing, { id: 'E2E-003', thens: { A1: true } }]) })
  assert.equal(extra.outcome, 'incomplete')
  assert.match(extra.reason!, /E2E-003 is not in the check's selection/)
})

test('the check selection decides the expected cases', () => {
  const selection = { status: ['active'], run: ['nightly', 'manual'] }
  const verdict = judge({ ...base, selection, result: playwright(allPassing) })
  assert.equal(verdict.outcome, 'incomplete')
  assert.match(verdict.reason!, /E2E-004 missing/)
})

test('a named run is judged against exactly the named cases', () => {
  const passed = judge({ ...base, cases: ['E2E-004'], result: playwright([{ id: 'E2E-004', thens: { A1: true } }]) })
  assert.equal(passed.outcome, 'passed')
  assert.deepEqual(passed.summary.map((item) => item.case), ['E2E-004'])
  const unknown = judge({ ...base, cases: ['E2E-999'], result: playwright([]) })
  assert.equal(unknown.outcome, 'incomplete')
  assert.match(unknown.reason!, /E2E-999 is not in the catalog/)
})

test('the cases format is judged by the same rules', () => {
  const result = {
    format: 'cases',
    cases: [
      { id: 'E2E-001', status: 'passed', ms: 10, thens: [{ id: 'A1', status: 'passed' }, { id: 'A2', status: 'passed' }] },
      { id: 'E2E-002', status: 'failed', thens: [{ id: 'A1', status: 'failed' }], error: 'late by 2 hours' },
    ],
  }
  const verdict = judge({ ...base, exitCode: 1, result })
  assert.equal(verdict.outcome, 'failed')
  assert.equal(verdict.summary[1].error, 'late by 2 hours')
  assert.equal(judge({ ...base, result: { format: 'cases', cases: [{ id: 'bad id', status: 'passed', thens: [] }] } }).outcome, 'incomplete')
  assert.equal(judge({ ...base, result: { format: 'junit', cases: [] } }).outcome, 'incomplete')
})

test('versions must be recorded for every component at start and end and stay unchanged', () => {
  const changed = judge({ ...base, deployedEnd: { ...sha, api: 'c'.repeat(40) }, result: playwright(allPassing) })
  assert.match(changed.reason!, /deployment changed/)
  assert.equal(judge({ ...base, deployedStart: null, result: playwright(allPassing) }).outcome, 'incomplete')
  assert.equal(judge({ ...base, deployedEnd: { web: sha.web }, result: playwright(allPassing) }).outcome, 'incomplete')
  assert.equal(judge({ ...base, deployedStart: { ...sha, api: null }, result: playwright(allPassing) }).outcome, 'incomplete')
  const worker = { worker: 'd'.repeat(40) }
  assert.equal(judge({ ...base, deployedStart: worker, deployedEnd: worker, result: playwright(allPassing) }).outcome, 'passed')
})

test('flaky, run-level errors, nonzero exit and unparseable results are incomplete', () => {
  assert.equal(judge({ ...base, result: playwright([{ ...allPassing[0], status: 'flaky' }, allPassing[1]]) }).outcome, 'incomplete')
  assert.equal(judge({ ...base, result: playwright(allPassing, [{ message: 'config error' }]) }).outcome, 'incomplete')
  assert.equal(judge({ ...base, exitCode: 1, result: playwright(allPassing) }).outcome, 'incomplete')
  assert.equal(judge({ ...base, result: { format: 'playwright', report: { nope: true } } }).outcome, 'incomplete')
  assert.equal(judge({ ...base, catalog: {}, result: playwright(allPassing) }).outcome, 'incomplete')
})

test('sensitive patterns are detected', () => {
  assert.equal(containsSensitive('{"Authorization":"x"}'), true)
  assert.equal(containsSensitive('header Bearer abc'), true)
  assert.equal(containsSensitive('eyJhbGciOiJI.eyJzdWIiOiIx.sig'), true)
  assert.equal(containsSensitive('Then A1: authorization regression is blocked'), false)
})

test('status follows the latest full run; lateness follows scheduled runs only', () => {
  const createdAt = new Date('2026-10-16T00:00:00Z')
  const scheduled = new Date('2026-10-16T03:10:00Z')
  const daily = { createdAt, periodSeconds: 86400, graceSeconds: 7200 }
  assert.equal(checkStatus({ ...daily, now: createdAt, latestFull: null, latestScheduled: null }).status, 'new')
  assert.equal(checkStatus({ ...daily, now: new Date('2026-10-17T05:10:00Z'), latestFull: { outcome: 'passed' }, latestScheduled: { finishedAt: scheduled } }).status, 'up')
  // A manual pass long after the last scheduled run cannot hide the missing scheduled run.
  assert.equal(checkStatus({ ...daily, now: new Date('2026-10-17T05:10:01Z'), latestFull: { outcome: 'passed' }, latestScheduled: { finishedAt: scheduled } }).status, 'late')
  // A scheduled check that never ran is late one period plus grace after creation.
  assert.equal(checkStatus({ ...daily, now: new Date('2026-10-17T02:00:01Z'), latestFull: { outcome: 'passed' }, latestScheduled: null }).status, 'late')
  assert.equal(checkStatus({ ...daily, now: scheduled, latestFull: { outcome: 'incomplete' }, latestScheduled: { finishedAt: scheduled } }).status, 'failing')
  assert.equal(
    checkStatus({ ...daily, now: scheduled, latestFull: { outcome: 'passed' }, latestScheduled: { finishedAt: scheduled } }).nextExpectedAt?.toISOString(),
    '2026-10-17T03:10:00.000Z',
  )
})

test('a check without a period is never late', () => {
  const manual = { createdAt: new Date('2020-01-01T00:00:00Z'), periodSeconds: null, graceSeconds: 0, latestScheduled: null }
  const now = new Date('2026-10-17T00:00:00Z')
  assert.equal(checkStatus({ ...manual, now, latestFull: null }).status, 'new')
  assert.equal(checkStatus({ ...manual, now, latestFull: { outcome: 'failed' } }).status, 'failing')
  assert.equal(checkStatus({ ...manual, now, latestFull: { outcome: 'passed' } }).nextExpectedAt, null)
})

test('a running run times out after the grace period', () => {
  const startedAt = new Date('2026-10-16T03:00:00Z')
  assert.equal(runTimedOut({ now: new Date('2026-10-16T05:00:00Z'), startedAt, graceSeconds: 7200, outcome: 'running' }), false)
  assert.equal(runTimedOut({ now: new Date('2026-10-16T05:00:01Z'), startedAt, graceSeconds: 7200, outcome: 'running' }), true)
  assert.equal(runTimedOut({ now: new Date('2026-10-16T05:00:01Z'), startedAt, graceSeconds: 7200, outcome: 'passed' }), false)
})
