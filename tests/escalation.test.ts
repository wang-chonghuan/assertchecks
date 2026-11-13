import assert from 'node:assert/strict'
import { test } from 'node:test'
import { splitSeverity } from '../src/server/interpret'
import {
  isWorkingTime, workingMsBetween, criticalStageDue, urgentEscalates, confirmationFrom, escalationMessage,
  onCallIndex, onCallRole, recallDue, parseAlertLog, type Contact, type Role,
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

test('onCallIndex advances one step per whole week and wraps, clamping before the start', () => {
  const start = at('2026-11-16T09:00:00Z') // Monday 09:00 Dublin (GMT in November)
  assert.equal(onCallIndex(start, at('2026-11-16T08:00:00Z'), 3), 0) // before the first handover
  assert.equal(onCallIndex(start, at('2026-11-18T12:00:00Z'), 3), 0) // week 1
  assert.equal(onCallIndex(start, at('2026-11-23T09:00:00Z'), 3), 1) // week 2 begins exactly at the handover
  assert.equal(onCallIndex(start, at('2026-11-23T08:59:00Z'), 3), 0) // one minute before, still week 1
  assert.equal(onCallIndex(start, at('2026-11-30T09:00:00Z'), 3), 2) // week 3
  assert.equal(onCallIndex(start, at('2026-12-07T09:00:00Z'), 3), 0) // week 4 wraps
})

test('onCallRole maps the week to the configured role order, null without a rotation', () => {
  const order: Role[] = ['final', 'primary', 'backup'] // Chonghuan, Qingyang, Yafei
  const start = at('2026-11-16T09:00:00Z')
  assert.equal(onCallRole(order, start, at('2026-11-17T03:00:00Z')), 'final')   // week 1, out of hours
  assert.equal(onCallRole(order, start, at('2026-11-24T03:00:00Z')), 'primary') // week 2
  assert.equal(onCallRole(order, start, at('2026-12-01T03:00:00Z')), 'backup')  // week 3
  assert.equal(onCallRole([], start, at('2026-11-17T03:00:00Z')), null)
  assert.equal(onCallRole(order, null, at('2026-11-17T03:00:00Z')), null)
})

test('recallDue is true first time and again only after 15 minutes', () => {
  const now = at('2026-11-17T03:00:00Z')
  assert.equal(recallDue(null, now), true)
  assert.equal(recallDue(at('2026-11-17T02:50:00Z'), now), false) // 10 minutes ago
  assert.equal(recallDue(at('2026-11-17T02:45:00Z'), now), true)  // 15 minutes ago
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

test('parseAlertLog keeps call and slack attempts and drops malformed or unknown entries (ASSERT-62)', () => {
  const notes = parseAlertLog([
    { stage: 0, kind: 'slack', ok: true, detail: '@primary', at: '2026-11-13T09:00:00Z' },
    { stage: 1, kind: 'call', ok: true, detail: 'CA123', at: '2026-11-13T09:15:00Z' },
    { stage: 2, kind: 'drill', ok: true, detail: 'note', at: '2026-11-13T09:30:00Z' }, // unknown kind: dropped
    { kind: 'call' }, // missing fields: defaulted, still a call
    'nonsense',
  ])
  assert.equal(notes.length, 3)
  assert.deepEqual(notes[0], { stage: 0, kind: 'slack', ok: true, detail: '@primary', at: '2026-11-13T09:00:00Z' })
  assert.equal(notes[1].detail, 'CA123')
  assert.deepEqual(notes[2], { stage: 0, kind: 'call', ok: false, detail: '', at: '' })
})

test('parseAlertLog returns [] for non-array input', () => {
  assert.deepEqual(parseAlertLog(null), [])
  assert.deepEqual(parseAlertLog(undefined), [])
  assert.deepEqual(parseAlertLog({}), [])
})
