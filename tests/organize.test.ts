import assert from 'node:assert/strict'
import { test } from 'node:test'
import { caseMeta, groupOrder, tagList } from '../src/lib/organize'

test('tags are split on commas, trimmed, and empty or repeated labels ignored', () => {
  assert.deepEqual(tagList(' smoke, permissions,,smoke ,'), ['smoke', 'permissions'])
  assert.deepEqual(tagList(''), [])
  assert.deepEqual(tagList(undefined), [])
})

test('a case without a group is ungrouped, and ungrouped sorts last', () => {
  assert.deepEqual(caseMeta({ group: ' Billing ', tags: 'smoke' }), { group: 'Billing', tags: ['smoke'] })
  assert.deepEqual(caseMeta({}), { group: null, tags: [] })
  assert.deepEqual(groupOrder([null, 'Sign-in', 'Billing', 'Sign-in']), ['Billing', 'Sign-in', null])
  assert.deepEqual(groupOrder([null]), [null])
})
