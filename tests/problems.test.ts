import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assemble, seenProblems, together, type StoredProblem } from '../src/server/problems'
import type { Telemetry } from '../src/server/telemetry'

const NOW = new Date('2026-10-21T12:00:00Z')
const HOUR = 60 * 60 * 1000
const ago = (hours: number) => new Date(NOW.getTime() - hours * HOUR)
const project = { slug: 'p', name: 'P' }

function stored(id: string, key: string, firstHoursAgo: number, lastHoursAgo: number, extra: Partial<StoredProblem> = {}): StoredProblem {
  return {
    id, kind: 'error', key, firstSeen: ago(firstHoursAgo), lastSeen: ago(lastHoursAgo),
    ignored: null, tickets: [], ...extra,
  }
}

function data(buckets: [key: string, hoursAgo: number, count: number][], extra: Partial<Telemetry> = {}): Telemetry {
  return {
    buckets: buckets.map(([key, hoursAgo, count]) => ({ key, bucket: ago(hoursAgo), count })),
    variants: [],
    noise: [],
    slow: [],
    ...extra,
  }
}

const view = (result: ReturnType<typeof assemble>, id: string) => {
  const found = result.problems.find((problem) => problem.id === id)
  assert.ok(found, `problem ${id}`)
  return found
}

test('an untriaged problem first seen within a day is new and to triage; failures are counted by window', () => {
  const result = assemble({
    project, now: NOW, portalUrl: null,
    stored: [stored('1', 'TimeoutError', 2, 1), stored('2', 'ValueError', 200, 30)],
    data: data([['TimeoutError', 2, 3], ['TimeoutError', 1, 1], ['ValueError', 30, 2], ['ValueError', 100, 4]]),
  })
  assert.deepEqual([view(result, '1').group, view(result, '1').isNew], ['triage', true])
  assert.deepEqual([view(result, '2').group, view(result, '2').isNew], ['triage', false])
  assert.equal(view(result, '1').count24h, 4)
  assert.equal(view(result, '2').count7d, 6)
  assert.deepEqual(result.headline, { triage: 2, isNew: 1, ticket: 0, stillOccurring: 0, last24h: 4, previous24h: 2 })
  // New problems come first.
  assert.equal(result.problems[0].id, '1')
})

test('a ticket keeps the problem visible and counts what happened after it was attached', () => {
  const ticketAt = (hoursAgo: number, url = 'https://linear.app/x/ENG-1') => ({ tickets: [{ id: url, url, by: 'a@b.c', at: ago(hoursAgo).toISOString() }] })
  const ticket = ticketAt(10)
  const result = assemble({
    project, now: NOW, portalUrl: null,
    stored: [
      stored('1', 'Still', 100, 2, ticket),
      stored('2', 'Quiet', 100, 50, ticketAt(48)),
    ],
    data: data([['Still', 20, 5], ['Still', 2, 3], ['Quiet', 50, 1]]),
  })
  assert.deepEqual(view(result, '1').sinceTicket, { count: 3, quietDays: null })
  // Nothing since the ticket: quiet for the days since it was attached.
  assert.deepEqual(view(result, '2').sinceTicket, { count: 0, quietDays: 2 })
  assert.equal(view(result, '2').group, 'ticket')
  assert.equal(result.headline.stillOccurring, 1)
  assert.deepEqual(result.problems.map((problem) => problem.id), ['1', '2'])
})

test('a problem quiet for 30 days leaves the working lists and comes back when it recurs', () => {
  const quiet = assemble({ project, now: NOW, portalUrl: null, stored: [stored('1', 'Old', 2000, 31 * 24)], data: data([['Old', 31 * 24, 1]]) })
  assert.equal(view(quiet, '1').group, 'quiet')
  const back = assemble({ project, now: NOW, portalUrl: null, stored: [stored('1', 'Old', 2000, 1)], data: data([['Old', 1, 1]]) })
  assert.equal(view(back, '1').group, 'triage')
})

test('not handling folds the problem away and removes it from the failure counts', () => {
  const result = assemble({
    project, now: NOW, portalUrl: null,
    stored: [stored('1', 'Noise', 5, 1, { ignored: { reason: 'extension', by: 'a@b.c', at: ago(1).toISOString() } }), stored('2', 'Real', 5, 1)],
    data: data([['Noise', 1, 40], ['Real', 1, 2]]),
  })
  assert.equal(view(result, '1').group, 'ignored')
  assert.equal(view(result, '1').count24h, 40)
  assert.equal(result.headline.last24h, 2)
  assert.equal(result.daily.at(-1)?.count, 2)
  assert.equal(result.daily.length, 30)
})

test('problems first seen within an hour, or active in mostly the same hours, are shown together', () => {
  const hours = (...hoursAgo: number[]) => new Set(hoursAgo.map((h) => Math.floor(ago(h).getTime() / HOUR)))
  const hints = together([
    { id: 'a', key: 'CannotConnectNow', firstSeen: ago(100).getTime(), hours: hours(100) },
    { id: 'b', key: 'ConnectionRefused', firstSeen: ago(99.9).getTime(), hours: hours(100) },
    { id: 'c', key: 'Timeout', firstSeen: ago(500).getTime(), hours: hours(500, 100) },
    { id: 'd', key: 'Unrelated', firstSeen: ago(300).getTime(), hours: hours(300, 200, 100, 50) },
  ])
  assert.deepEqual(hints.get('a'), ['ConnectionRefused', 'Timeout'])
  assert.deepEqual(hints.get('c'), ['CannotConnectNow', 'ConnectionRefused'])
  assert.deepEqual(hints.get('d'), [])
})

test('slow hours become slow problems with their latest p95, and are not counted as failures', () => {
  const telemetry = data([], { slow: [
    { operation: 'POST /auth', hour: ago(3), p95Ms: 1500.4, usualMs: 86 },
    { operation: 'POST /auth', hour: ago(30), p95Ms: 9000, usualMs: 86 },
  ] })
  assert.deepEqual(seenProblems(telemetry).map((item) => [item.kind, item.key]), [['slow', 'POST /auth']])
  const result = assemble({
    project, now: NOW, portalUrl: null,
    stored: [{ ...stored('1', 'POST /auth', 30, 2), kind: 'slow' }],
    data: telemetry,
  })
  assert.deepEqual(view(result, '1').slow, { p95Ms: 1500, usualMs: 86 })
  assert.equal(view(result, '1').count7d, 2)
  assert.equal(result.headline.last24h, 0)
})

test('first and last sighting merge across a problem\'s message variants', () => {
  const variant = (first: number, last: number) => ({
    key: 'E', template: `t${first}`, count: 1, first: ago(first), last: ago(last), type: null, message: 'm',
    browser: false, role: null, place: null, stack: null,
  })
  const seen = seenProblems(data([], { variants: [variant(10, 5), variant(20, 2)] }))
  assert.deepEqual(seen, [{ kind: 'error', key: 'E', firstSeen: ago(20), lastSeen: ago(2) }])
})

test('a stored problem the telemetry still covers but no longer counts is dropped unless decided on', () => {
  const result = assemble({
    project, now: NOW, portalUrl: null,
    stored: [
      stored('1', 'NowNoise', 300, 200),
      stored('2', 'Decided', 300, 200, { ignored: { reason: 'r', by: 'a@b.c', at: ago(1).toISOString() } }),
      stored('3', 'Ancient', 3000, 24 * 100),
    ],
    data: data([]),
  })
  assert.deepEqual(result.problems.map((problem) => problem.id).sort(), ['2', '3'])
})

test('a problem keeps every ticket; "since the ticket" counts from the newest', () => {
  const tickets = [
    { id: '2', url: 'https://linear.app/x/ENG-2', by: 'a@b.c', at: ago(5).toISOString() },
    { id: '1', url: 'https://linear.app/x/ENG-1', by: 'a@b.c', at: ago(50).toISOString() },
  ]
  const result = assemble({
    project, now: NOW, portalUrl: null,
    stored: [stored('1', 'Twice', 100, 1, { tickets })],
    data: data([['Twice', 40, 4], ['Twice', 1, 2]]),
  })
  assert.equal(view(result, '1').tickets.length, 2)
  assert.deepEqual(view(result, '1').sinceTicket, { count: 2, quietDays: null })
  assert.equal(view(result, '1').group, 'ticket')
})
