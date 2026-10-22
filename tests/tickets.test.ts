import assert from 'node:assert/strict'
import { test } from 'node:test'
import { caseTickets, projectTickets, ticketOnCheck, type CaseRun } from '../src/server/tickets'

const NOW = new Date('2026-10-22T12:00:00Z')
const DAY = 24 * 60 * 60 * 1000
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY)
const link = (id: string, days: number, url = `https://linear.app/x/${id}`) => ({ id, url, by: 'a@b.c', at: daysAgo(days).toISOString() })
const runs = (...results: [days: number, passed: boolean][]): CaseRun[] =>
  results.map(([days, passed], index) => ({ runId: String(index + 1), finishedAt: daysAgo(days), passed }))

test('a ticket waits for a run, fails while the newest run fails, and is verified by two passes in a row', () => {
  assert.equal(ticketOnCheck(link('A', 1), runs([2, false])).state, 'waiting')
  const failing = ticketOnCheck(link('A', 5), runs([6, false], [4, false], [3, true], [2, false]))
  assert.deepEqual([failing.state, failing.failed, failing.since.length], ['failing', 2, 3])
  assert.equal(ticketOnCheck(link('A', 5), runs([4, false], [3, true])).state, 'passing')
  const verified = ticketOnCheck(link('A', 5), runs([4, false], [3, true], [2, true], [1, true]))
  assert.equal(verified.state, 'verified')
  // Verified when the streak reached two runs, not at its last run.
  assert.equal(verified.verifiedAt, daysAgo(2).toISOString())
})

test('passes before the ticket do not count towards verifying it', () => {
  assert.equal(ticketOnCheck(link('A', 2), runs([4, true], [3, true], [1, true])).state, 'passing')
})

test('a case keeps every ticket newest first, and recurs when it fails after one was verified', () => {
  const history = runs([10, false], [8, true], [7, true], [2, false])
  const result = caseTickets([link('OLD', 9), link('NEW', 1)], history)
  assert.deepEqual(result.tickets.map((ticket) => ticket.id), ['NEW', 'OLD'])
  assert.equal(result.recurred, true)
  assert.equal(caseTickets([link('OLD', 9)], runs([10, false], [8, true], [2, false])).recurred, false)
})

test('the project view groups by ticket and splits open, recently verified and earlier', () => {
  const verifiedRuns = runs([20, false], [19, true], [18, true])
  const recentRuns = runs([5, false], [3, true], [2, true])
  const tickets = projectTickets({
    now: NOW,
    titles: new Map([['E2E-1', 'One'], ['E2E-2', 'Two'], ['E2E-3', 'Three']]),
    links: [
      { ...link('L1', 21, 'https://t/OLD'), case: 'E2E-1' },
      { ...link('L2', 6, 'https://t/RECENT'), case: 'E2E-2' },
      { ...link('L3', 6, 'https://t/OPEN'), case: 'E2E-3' },
      { ...link('L4', 6, 'https://t/OPEN'), case: 'E2E-2' },
    ],
    checks: [
      { slug: 'dev', name: 'DEV', runs: new Map([['E2E-1', verifiedRuns], ['E2E-2', recentRuns], ['E2E-3', runs([4, false], [1, false])]]) },
      // PROD never ran E2E-1, so it says nothing about that ticket.
      { slug: 'prod', name: 'PROD', runs: new Map([['E2E-2', recentRuns]]) },
    ],
  })
  assert.deepEqual(tickets.map((ticket) => [ticket.url, ticket.section]), [
    ['https://t/OPEN', 'open'], ['https://t/RECENT', 'recent'], ['https://t/OLD', 'earlier'],
  ])
  const open = tickets[0]
  assert.deepEqual(open.cases.map((item) => [item.case, item.checks.map((check) => `${check.slug}:${check.state}`)]), [
    ['E2E-2', ['dev:verified', 'prod:verified']], ['E2E-3', ['dev:failing']],
  ])
})
