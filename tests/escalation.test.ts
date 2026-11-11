import assert from 'node:assert/strict'
import { test } from 'node:test'
import { splitSeverity } from '../src/server/interpret'
import {
  isWorkingTime, workingMsBetween, criticalStageDue, urgentEscalates, confirmationFrom, escalationMessage, type Contact,
} from '../src/server/escalation'

// November 2026 is winter in Ireland, so Dublin local time equals UTC — the fixtures read cleanly.
const at = (iso: string) => new Date(iso)

test('splitSeverity reads the first line and strips it', () => {
  assert.deepEqual(splitSeverity('SEVERITY: critical\nWhat happens: down'), { severity: 'critical', reading: 'What happens: down' })
  assert.equal(splitSeverity('SEVERITY: low\n\nbody').severity, 'low')
  assert.equal(splitSeverity('severity:  URGENT \nx').severity, 'urgent')
})

test('splitSeverity defaults to urgent when the line is missing or unknown', () => {
  assert.deepEqual(splitSeverity('What happens: x'), { severity: 'urgent', reading: 'What happens: x' })
  assert.equal(splitSeverity('SEVERITY: medium\nx').severity, 'urgent')
})

test('isWorkingTime is Mon-Fri 09:00-17:30 Dublin', () => {
  assert.equal(isWorkingTime(at('2026-11-10T10:00:00Z')), true) // Tue 10:00
  assert.equal(isWorkingTime(at('2026-11-10T08:59:00Z')), false) // before 09:00
  assert.equal(isWorkingTime(at('2026-11-10T17:30:00Z')), false) // 17:30 is past the window
  assert.equal(isWorkingTime(at('2026-11-14T10:00:00Z')), false) // Saturday
})

test('workingMsBetween counts only working time, across a weekend', () => {
  assert.equal(workingMsBetween(at('2026-11-10T09:00:00Z'), at('2026-11-10T10:00:00Z')), 60 * 60_000)
  // Fri 17:00 -> Mon 09:30: Fri 17:00-17:30 (30m) + Mon 09:00-09:30 (30m).
  assert.equal(workingMsBetween(at('2026-11-13T17:00:00Z'), at('2026-11-16T09:30:00Z')), 60 * 60_000)
  // An after-hours gap with no working time in it.
  assert.equal(workingMsBetween(at('2026-11-10T18:00:00Z'), at('2026-11-10T23:00:00Z')), 0)
})

test('criticalStageDue steps at 15 and 30 minutes', () => {
  const t0 = at('2026-11-10T10:00:00Z')
  assert.equal(criticalStageDue(t0, at('2026-11-10T10:10:00Z')), 0)
  assert.equal(criticalStageDue(t0, at('2026-11-10T10:15:00Z')), 1)
  assert.equal(criticalStageDue(t0, at('2026-11-10T10:30:00Z')), 2)
})

test('urgentEscalates needs an hour of working time and a working moment', () => {
  // Created 09:00 Tue, now 10:30 Tue: 90 working minutes and still working hours.
  assert.equal(urgentEscalates(at('2026-11-10T09:00:00Z'), at('2026-11-10T10:30:00Z')), true)
  // Only 40 working minutes before the window closes.
  assert.equal(urgentEscalates(at('2026-11-10T16:50:00Z'), at('2026-11-10T17:40:00Z')), false)
  // An hour of working time has passed by Monday, but 08:00 is before the window: do not call yet.
  assert.equal(urgentEscalates(at('2026-11-13T16:00:00Z'), at('2026-11-16T08:00:00Z')), false)
})

const comment = (email: string | null, createdAt: string, isBot = false) => ({ authorEmail: email, createdAt, isBot })

test('confirmationFrom takes the first human reply by a responsible person after the notice', () => {
  const emails = new Set(['qingyang.wang@narrativebanking.com', 'yafei.li@narrativebanking.com'])
  const since = at('2026-11-10T10:00:00Z')
  const got = confirmationFrom([
    comment('qingyang.wang@narrativebanking.com', '2026-11-10T09:00:00Z'), // before the notice
    comment('someone.else@narrativebanking.com', '2026-11-10T10:05:00Z'), // not a responsible person
    comment('yafei.li@narrativebanking.com', '2026-11-10T10:10:00Z'), // counts
  ], emails, since)
  assert.deepEqual(got, { email: 'yafei.li@narrativebanking.com', at: '2026-11-10T10:10:00Z' })
})

test('confirmationFrom ignores bot and automation replies', () => {
  const emails = new Set(['qingyang.wang@narrativebanking.com'])
  const since = at('2026-11-10T10:00:00Z')
  assert.equal(confirmationFrom([
    comment(null, '2026-11-10T10:05:00Z', true),
    comment('qingyang.wang@narrativebanking.com', '2026-11-10T10:06:00Z', true),
  ], emails, since), null)
})

test('escalationMessage names who must respond and carries no error message body', () => {
  const contact: Contact = { role: 'primary', name: 'Qingyang Wang', slackId: 'U08SA7K8J9X', phone: '+353', email: 'q@x.com' }
  const text = escalationMessage({
    severity: 'critical', projectName: 'Benefits Finder', env: 'prod',
    problem: 'TimeoutError at /auth/session (server)', url: 'https://linear.app/x/issue/ENG-1/', contact, calling: true,
  })
  assert.match(text, /<@U08SA7K8J9X>/)
  assert.match(text, /Benefits Finder \(prod\)/)
  assert.match(text, /ENG-1/)
  assert.match(text, /calling now/)
})
