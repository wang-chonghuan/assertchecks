import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LOGIN_CODE, loginCode, publicOrigin } from '../src/server/client-tokens'

test('login codes are two groups of four without look-alike characters', () => {
  for (let i = 0; i < 200; i++) assert.match(loginCode(), LOGIN_CODE)
  assert.equal(loginCode(Uint8Array.from([0, 1, 2, 3, 31, 32, 255, 8])), 'ABCD-9A9J')
})

test('the public origin follows the ingress, not the plain request', () => {
  const behind = new Request('http://ca-app.internal:3000/api/cli/session', {
    headers: { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'assertchecks.com' },
  })
  assert.equal(publicOrigin(behind), 'https://assertchecks.com')
  assert.equal(publicOrigin(new Request('http://127.0.0.1:63038/api/cli/session')), 'http://127.0.0.1:63038')
})
