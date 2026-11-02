import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkFormat } from '../src/server/ingest'

const catalog = {
  version: 1,
  cases: [{
    id: 'E2E-001',
    title: 'Request completes',
    status: 'active',
    run: 'regular',
    given: ['A signed-in test account'],
    when: ['Read its own record'],
    then: [{ id: 'A1', expect: 'The request completes' }],
  }],
}

test('format-only dry runs accept report text without credential keyword filtering', () => {
  for (const error of ['Authorization: [REDACTED]', 'Bearer [REDACTED]', 'eyJnot-a-token.eyJnot-a-token']) {
    for (const result of [
      { format: 'playwright', report: { suites: [], errors: [{ message: error }] } },
      { format: 'cases', cases: [{ id: 'E2E-001', status: 'failed', thens: [{ id: 'A1', status: 'failed' }], error }] },
    ]) {
      assert.deepEqual(checkFormat(JSON.stringify({ catalog, result })), {
        status: 200, body: { valid: true },
      })
    }
  }
})

test('keyword-containing reports still fail format validation when malformed', () => {
  const reply = checkFormat(JSON.stringify({
    catalog,
    result: { format: 'playwright', report: { errors: [{ message: 'Authorization: [REDACTED]' }] } },
  }))
  assert.equal(reply.status, 200)
  assert.equal(reply.body.valid, false)
  assert.deepEqual(reply.body.errors, ['result.report: missing suites'])
})
