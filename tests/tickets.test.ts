import assert from 'node:assert/strict'
import { test } from 'node:test'
import { caseStatus, projectBugs, type CaseRun } from '../src/server/tickets'
import type { Bug } from '../src/lib/types'

const NOW = new Date('2026-10-22T12:00:00Z')
const DAY = 24 * 60 * 60 * 1000
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY)
const ticket = (key: string, days: number) => ({ id: key, url: `https://linear.app/x/issue/${key}`, by: 'a@b.c', at: daysAgo(days).toISOString() })
const runs = (...results: [days: number, passed: boolean][]): CaseRun[] =>
  results.map(([days, passed], index) => ({ runId: String(index + 1), finishedAt: daysAgo(days), passed }))

test('a case that passes everywhere and never had a ticket is not a bug', () => {
  assert.equal(caseStatus([], [runs([2, true], [1, true])]), null)
})

test('a failing case without a ticket needs one, in whichever environment it fails', () => {
  assert.equal(caseStatus([], [runs([1, true]), runs([1, false])])?.status, 'needs-ticket')
})

test('with a ticket it is in progress until every environment passes it twice in a row since', () => {
  const t = [ticket('ENG-1', 5)]
  assert.equal(caseStatus(t, [runs([6, false], [4, false])])?.status, 'in-progress')
  // Passed once is still in progress.
  assert.equal(caseStatus(t, [runs([6, false], [3, true])])?.status, 'in-progress')
  // No run since the ticket is still in progress.
  assert.equal(caseStatus(t, [runs([6, false])])?.status, 'in-progress')
  // DEV fixed, PROD not yet run twice: in progress.
  assert.equal(caseStatus(t, [runs([4, true], [3, true]), runs([6, false], [2, true])])?.status, 'in-progress')
  const fixed = caseStatus(t, [runs([4, true], [3, true]), runs([2, true], [1, true])])
  assert.equal(fixed?.status, 'fixed')
  assert.equal(fixed?.fixedAt, daysAgo(1).toISOString())
})

test('passes before the newest ticket do not count', () => {
  assert.equal(caseStatus([ticket('ENG-1', 2)], [runs([4, true], [3, true], [1, true])])?.status, 'in-progress')
})

test('a case failing again after its ticket fixed it needs a new ticket and names the old one', () => {
  const result = caseStatus([ticket('ENG-1', 9), ticket('ENG-2', 20)], [runs([8, true], [7, true], [2, false])])
  assert.equal(result?.status, 'needs-ticket')
  assert.equal(result?.previous, 'https://linear.app/x/issue/ENG-1')
  assert.deepEqual(result?.tickets.map((item) => item.id), ['ENG-1', 'ENG-2'])
  // A new ticket after that puts it back in progress.
  assert.equal(caseStatus([ticket('ENG-3', 1), ticket('ENG-1', 9)], [runs([8, true], [7, true], [2, false])])?.status, 'in-progress')
})

test('the list puts bugs needing a ticket first and drops ones fixed more than two weeks ago', () => {
  const bug = (id: string, status: Bug['status'], fixedDaysAgo?: number): Bug => ({
    case: id, title: id, check: 'dev', status, tickets: [], previous: null,
    fixedAt: fixedDaysAgo === undefined ? null : daysAgo(fixedDaysAgo).toISOString(),
  })
  const list = projectBugs([bug('E2E-3', 'fixed', 3), bug('E2E-2', 'in-progress'), bug('E2E-4', 'fixed', 30), bug('E2E-1', 'needs-ticket')], NOW)
  assert.deepEqual(list.map((item) => item.case), ['E2E-1', 'E2E-2', 'E2E-3'])
})
