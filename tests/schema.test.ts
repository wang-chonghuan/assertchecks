import assert from 'node:assert/strict'
import { test } from 'node:test'
import { catalogErrors, resultErrors } from '../src/server/schema'

const catalog = () => ({
  version: 1,
  projects: ['dev'],
  cases: [
    {
      id: 'E2E-001',
      title: 'Sign in',
      type: 'ui',
      status: 'active',
      run: 'regular',
      given: ['A registered account'],
      when: ['Sign in'],
      then: [{ id: 'A1', expect: 'The dashboard greets the user' }],
      data: { mode: 'no_business_change' },
    },
  ],
})

test('a catalog with the core fields passes and keeps project fields', () => {
  assert.deepEqual(catalogErrors(catalog()), [])
})

test('a missing or wrong catalog field is named by its path', () => {
  const missing = catalog()
  delete (missing.cases[0].then[0] as { expect?: string }).expect
  assert.deepEqual(catalogErrors(missing), ['catalog.cases[0].then[0]: missing expect'])

  const status = catalog()
  status.cases[0].status = 'enabled'
  assert.deepEqual(catalogErrors(status), ['catalog.cases[0].status: must be one of "active", "draft", "retired"'])

  const blank = catalog()
  blank.cases[0].given = ['   ']
  assert.deepEqual(catalogErrors(blank), ['catalog.cases[0].given[0]: must match \\S'])

  assert.deepEqual(catalogErrors({ cases: [] }), ['catalog: missing version', 'catalog.cases: needs at least 1 item(s)'])
  assert.deepEqual(catalogErrors(null), ['catalog: must be object'])
})

test('case IDs and Then IDs must be unique', () => {
  const twice = catalog()
  twice.cases.push({ ...twice.cases[0], then: [twice.cases[0].then[0], twice.cases[0].then[0]] })
  assert.deepEqual(catalogErrors(twice), [
    'catalog.cases: case E2E-001 appears more than once',
    'catalog.cases[1].then: Then A1 appears more than once',
  ])
})

test('both result formats are accepted', () => {
  assert.deepEqual(resultErrors({ format: 'playwright', report: { suites: [], errors: [], stats: {} } }), [])
  assert.deepEqual(resultErrors({
    format: 'cases',
    cases: [{ id: 'E2E-001', title: 'Sign in', status: 'passed', ms: 12.5, thens: [{ id: 'A1', status: 'passed' }], error: null }],
  }), [])
})

test('a wrong result is named against the format it declares', () => {
  assert.deepEqual(resultErrors({ format: 'junit', report: {} }), ['result: must be one of: format "playwright" or format "cases"'])
  assert.deepEqual(resultErrors({ format: 'playwright', report: {} }), ['result.report: missing suites'])
  assert.deepEqual(resultErrors({
    format: 'cases',
    cases: [{ id: 'E2E-001', status: 'ok', thens: [{ id: 'A1', status: 'not_run' }], extra: 1 }],
  }), [
    'result.cases[0].status: must be one of "passed", "failed", "skipped", "flaky"',
    'result.cases[0].thens[0].status: must be one of "passed", "failed"',
    'result.cases[0]: unexpected field extra',
  ])
})

test('group and tags are optional organizing fields', () => {
  const organized = catalog()
  Object.assign(organized.cases[0], { group: 'Sign-in', tags: 'smoke, permissions,smoke,' })
  assert.deepEqual(catalogErrors(organized), [])

  const untagged = catalog()
  Object.assign(untagged.cases[0], { tags: '' })
  assert.deepEqual(catalogErrors(untagged), [])

  const blank = catalog()
  Object.assign(blank.cases[0], { group: '' })
  assert.deepEqual(catalogErrors(blank), ['catalog.cases[0].group: must not be empty'])

  const listed = catalog()
  Object.assign(listed.cases[0], { tags: ['smoke'] })
  assert.deepEqual(catalogErrors(listed), ['catalog.cases[0].tags: must be string'])
})
