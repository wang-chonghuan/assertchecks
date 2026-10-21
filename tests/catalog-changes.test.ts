import assert from 'node:assert/strict'
import { test } from 'node:test'
import { catalogChanges } from '../src/server/catalog-changes'
import { DEFAULT_SELECTION } from '../src/server/judge'

const item = (id: string, status = 'active', run = 'regular') => ({ id, title: `Case ${id}`, status, run })
const catalog = (...cases: ReturnType<typeof item>[]) => ({ version: 1, cases })

test('a required case removed from the catalog is reported', () => {
  assert.deepEqual(catalogChanges(catalog(item('E2E-001'), item('E2E-002')), catalog(item('E2E-001')), DEFAULT_SELECTION), [
    { case: 'E2E-002', title: 'Case E2E-002', change: 'removed', status: null, run: null },
  ])
})

test('a required case moved to draft, on-demand or retired is reported with its new state', () => {
  const before = catalog(item('E2E-001'), item('E2E-002'), item('E2E-003'))
  const after = catalog(item('E2E-001', 'draft'), item('E2E-002', 'active', 'on-demand'), item('E2E-003', 'retired'))
  assert.deepEqual(catalogChanges(before, after, DEFAULT_SELECTION).map((change) => [change.case, change.change, change.status, change.run]), [
    ['E2E-001', 'moved', 'draft', null],
    ['E2E-002', 'moved', null, 'on-demand'],
    ['E2E-003', 'moved', 'retired', null],
  ])
})

test('additions, promotions, edits and cases that were never required are not reported', () => {
  const before = catalog(item('E2E-001'), item('E2E-002', 'draft'), item('E2E-003', 'active', 'on-demand'))
  const after = catalog({ ...item('E2E-001'), title: 'Renamed' }, item('E2E-002'), item('E2E-004'))
  assert.deepEqual(catalogChanges(before, after, DEFAULT_SELECTION), [])
})

test('the check selection decides which cases were required', () => {
  const selection = { status: ['active'], run: ['regular', 'on-demand'] }
  const before = catalog(item('E2E-001', 'active', 'on-demand'))
  assert.deepEqual(catalogChanges(before, catalog(item('E2E-001', 'active', 'regular')), selection), [])
  assert.deepEqual(catalogChanges(before, catalog(item('E2E-001', 'draft', 'on-demand')), selection).map((change) => [change.status, change.run]), [['draft', null]])
  assert.deepEqual(catalogChanges(catalog(item('E2E-001')), catalog(item('E2E-001', 'draft', 'on-demand')), DEFAULT_SELECTION).map((change) => [change.status, change.run]), [['draft', 'on-demand']])
})

test('a missing previous or latest catalog yields no comparison noise', () => {
  assert.deepEqual(catalogChanges(null, catalog(item('E2E-001')), DEFAULT_SELECTION), [])
  assert.deepEqual(catalogChanges(catalog(item('E2E-001')), null, DEFAULT_SELECTION), [])
  assert.deepEqual(catalogChanges(catalog(), catalog(), DEFAULT_SELECTION), [])
})
