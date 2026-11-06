import assert from 'node:assert/strict'
import { test } from 'node:test'
import { failureEventKey, failureEvents, failureEventsKql, parseFailureEvent } from '../src/server/failure-events'

test('a declaration is event:property=value and names its problem', () => {
  const declared = parseFailureEvent(' bf_auth_recovery:outcome=failed ')
  assert.deepEqual(declared, { event: 'bf_auth_recovery', key: 'outcome', value: 'failed' })
  assert.equal(failureEventKey(declared), 'bf_auth_recovery outcome=failed')
})

test('anything that could change the query is refused', () => {
  for (const bad of ['bf_auth_recovery', 'bf_auth_recovery:outcome', 'a:b=c"; drop', 'a:b=c d', 'a b:c=d', ':b=c', 'a:=c', 'a:b=']) {
    assert.throws(() => parseFailureEvent(bad), /event:property=value/, bad)
  }
})

test('stored declarations are checked again before they reach a query', () => {
  assert.deepEqual(failureEvents(null), [])
  assert.deepEqual(failureEvents([{ event: 'e', key: 'k', value: 'v' }]), [{ event: 'e', key: 'k', value: 'v' }])
  assert.throws(() => failureEvents([{ event: 'e', key: 'k', value: 'v"' }]), /invalid failure event/)
  assert.throws(() => failureEvents({ event: 'e' }), /invalid failure events/)
})

test('each declaration becomes one query branch that matches its event and property and skips the noise rules', () => {
  const [branch] = failureEventsKql([{ event: 'bf_auth_recovery', key: 'outcome', value: 'failed' }])
  assert.match(branch, /^\(AppEvents/)
  assert.match(branch, /where Name == "bf_auth_recovery" and tostring\(Properties\["outcome"\]\) == "failed"/)
  assert.match(branch, /ProblemId = "bf_auth_recovery outcome=failed"/)
  assert.match(branch, /declared = true\)$/)
  assert.deepEqual(failureEventsKql([]), [])
})
