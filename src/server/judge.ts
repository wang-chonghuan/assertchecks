// Pure parsing and judgement of a run. No I/O, so it is testable with real reports.
// Every accepted result format is parsed into the same per-case shape and judged by one set of rules.

export type Outcome = 'running' | 'passed' | 'failed' | 'incomplete'
export type ThenStatus = 'passed' | 'failed' | 'not_run'
export type CaseStatus = 'passed' | 'failed' | 'skipped' | 'flaky' | 'missing'
export type Trigger = 'schedule' | 'manual'

export interface ThenResult {
  id: string
  status: ThenStatus
}

export interface CaseResult {
  case: string
  title: string
  status: CaseStatus
  ms: number | null
  thens: ThenResult[]
  error: string | null
}

// Tested component name → deployed SHA, for example { web, api }.
export type Versions = Record<string, string | null>

// Catalog filter a full run must cover.
export interface Selection {
  status: string[]
  run: string[]
}

export const DEFAULT_SELECTION: Selection = { status: ['active'], run: ['nightly'] }

export interface Judgement {
  outcome: Exclude<Outcome, 'running'>
  reason: string | null
  summary: CaseResult[]
}

interface CatalogCase {
  id: string
  title: string
  status: string
  run: string
  then: { id: string }[]
}

// One case as reported by the runner, before it is compared with the catalog.
interface ReportedCase {
  title: string
  status: Exclude<CaseStatus, 'missing'>
  ms: number | null
  thens: Map<string, 'passed' | 'failed'>
  error: string | null
}

interface ParsedResult {
  cases: Map<string, ReportedCase>
  runErrors: number
}

const CASE_ID = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/
const SENSITIVE = [/\bAuthorization\b/, /Bearer\s/, /eyJ[A-Za-z0-9_-]{5,}\.eyJ[A-Za-z0-9_-]{5,}/]
const ERROR_LIMIT = 600

export function containsSensitive(text: string): boolean {
  return SENSITIVE.some((pattern) => pattern.test(text))
}

function cleanError(message: unknown): string | null {
  if (typeof message !== 'string' || !message) return null
  // Strip ANSI colour codes emitted by test runners.
  const text = message.replace(/\u001b\[[0-9;]*m/g, '').trim()
  return text.length > ERROR_LIMIT ? `${text.slice(0, ERROR_LIMIT)}…` : text
}

// ---- format: playwright (Playwright's native JSON report, uploaded unchanged) ----

interface PwStep { title: string; error?: unknown; steps?: PwStep[] }
interface PwResult {
  status: string
  duration: number
  error?: { message?: string }
  errors?: { message?: string }[]
  steps?: PwStep[]
}
interface PwSpec { title: string; tests: { status: string; results: PwResult[] }[] }
interface PwSuite { specs?: PwSpec[]; suites?: PwSuite[] }

const PW_CASE_TITLE = /^([A-Z0-9]+(?:-[A-Z0-9]+)*):/
const PW_THEN_TITLE = /^Then ([A-Za-z0-9]+):/

function collectThens(steps: PwStep[] | undefined, found: Map<string, 'passed' | 'failed'>): void {
  for (const step of steps ?? []) {
    const match = PW_THEN_TITLE.exec(step.title)
    if (match) found.set(match[1], step.error ? 'failed' : 'passed')
    collectThens(step.steps, found)
  }
}

function pwStatus(status: string): ReportedCase['status'] {
  if (status === 'expected') return 'passed'
  if (status === 'skipped') return 'skipped'
  if (status === 'flaky') return 'flaky'
  return 'failed'
}

function parsePlaywright(report: unknown): ParsedResult {
  const suites = (report as { suites?: unknown })?.suites
  if (!Array.isArray(suites)) throw new Error('playwright report has no suites array')
  const cases = new Map<string, ReportedCase>()
  const walk = (suite: PwSuite) => {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const match = PW_CASE_TITLE.exec(spec.title)
        if (!match) throw new Error(`test title without case ID: ${spec.title}`)
        if (cases.has(match[1])) throw new Error(`case ${match[1]} appears more than once`)
        const result = test.results.at(-1)
        const thens = new Map<string, 'passed' | 'failed'>()
        collectThens(result?.steps, thens)
        cases.set(match[1], {
          title: spec.title.slice(match[0].length).trim(),
          status: pwStatus(test.status),
          ms: result ? Math.round(result.duration) : null,
          thens,
          error: cleanError(result?.error?.message ?? result?.errors?.[0]?.message),
        })
      }
    }
    for (const child of suite.suites ?? []) walk(child)
  }
  for (const suite of suites as PwSuite[]) walk(suite)
  const errors = (report as { errors?: unknown }).errors
  return { cases, runErrors: Array.isArray(errors) ? errors.length : 0 }
}

// ---- format: cases (written directly by producers that are not test runners) ----

const CASE_STATUSES = ['passed', 'failed', 'skipped', 'flaky']

function parseCases(value: unknown, errors: unknown): ParsedResult {
  if (!Array.isArray(value)) throw new Error('cases must be an array')
  const cases = new Map<string, ReportedCase>()
  for (const item of value as Record<string, unknown>[]) {
    const id = item?.id
    if (typeof id !== 'string' || !CASE_ID.test(id)) throw new Error('every case needs an ID such as E2E-001')
    if (cases.has(id)) throw new Error(`case ${id} appears more than once`)
    if (!CASE_STATUSES.includes(item.status as string)) throw new Error(`case ${id} has an invalid status`)
    if (!Array.isArray(item.thens)) throw new Error(`case ${id} needs a thens array`)
    const thens = new Map<string, 'passed' | 'failed'>()
    for (const then of item.thens as Record<string, unknown>[]) {
      if (typeof then?.id !== 'string' || !['passed', 'failed'].includes(then.status as string)) {
        throw new Error(`case ${id} has an invalid Then`)
      }
      thens.set(then.id, then.status as 'passed' | 'failed')
    }
    cases.set(id, {
      title: typeof item.title === 'string' ? item.title : '',
      status: item.status as ReportedCase['status'],
      ms: typeof item.ms === 'number' ? Math.round(item.ms) : null,
      thens,
      error: cleanError(item.error),
    })
  }
  return { cases, runErrors: Array.isArray(errors) ? errors.length : 0 }
}

export function parseResult(result: unknown): ParsedResult {
  const envelope = result as { format?: unknown; report?: unknown; cases?: unknown; errors?: unknown }
  if (envelope?.format === 'playwright') return parsePlaywright(envelope.report)
  if (envelope?.format === 'cases') return parseCases(envelope.cases, envelope.errors)
  throw new Error('result.format must be "playwright" or "cases"')
}

// ---- judgement ----

function catalogCases(catalog: unknown): CatalogCase[] {
  const cases = (catalog as { cases?: unknown })?.cases
  if (!Array.isArray(cases)) throw new Error('catalog has no cases array')
  return cases as CatalogCase[]
}

export function expectedCases(catalog: unknown, selection: Selection, named: string[] | null): CatalogCase[] {
  const all = catalogCases(catalog)
  if (named) {
    return named.map((id) => {
      const found = all.find((item) => item.id === id)
      if (!found) throw new Error(`named case ${id} is not in the catalog`)
      return found
    })
  }
  return all.filter((item) => selection.status.includes(item.status) && selection.run.includes(item.run))
}

function versionsMatch(start: Versions | null, end: Versions | null): string | null {
  const startKeys = Object.keys(start ?? {}).sort()
  const endKeys = Object.keys(end ?? {}).sort()
  const recorded = (versions: Versions | null, keys: string[]) =>
    keys.length > 0 && keys.every((key) => typeof versions?.[key] === 'string')
  if (!recorded(start, startKeys) || !recorded(end, endKeys) || startKeys.join() !== endKeys.join()) {
    return 'deployed versions not recorded at start and end'
  }
  if (startKeys.some((key) => start![key] !== end![key])) return 'deployment changed during the run'
  return null
}

export function judge(input: {
  result: unknown
  catalog: unknown
  exitCode: number
  deployedStart: Versions | null
  deployedEnd: Versions | null
  selection: Selection
  cases: string[] | null
  // A dry run has no start, so it cannot compare versions.
  skipVersions?: boolean
}): Judgement {
  let expected: CatalogCase[]
  let parsed: ParsedResult
  try {
    expected = expectedCases(input.catalog, input.selection, input.cases)
    parsed = parseResult(input.result)
  } catch (error) {
    return { outcome: 'incomplete', reason: `Unparseable run: ${(error as Error).message}`, summary: [] }
  }

  const failures: string[] = []
  const gaps: string[] = []
  const summary: CaseResult[] = []

  for (const spec of expected) {
    const item = parsed.cases.get(spec.id)
    if (!item) {
      gaps.push(`${spec.id} missing from report`)
      summary.push({
        case: spec.id,
        title: spec.title,
        status: 'missing',
        ms: null,
        thens: spec.then.map((then) => ({ id: then.id, status: 'not_run' })),
        error: null,
      })
      continue
    }
    const thens: ThenResult[] = spec.then.map((then) => ({ id: then.id, status: item.thens.get(then.id) ?? 'not_run' }))
    for (const id of item.thens.keys()) {
      if (!spec.then.some((then) => then.id === id)) gaps.push(`${spec.id} reports undeclared Then ${id}`)
    }
    if (item.status === 'failed' || thens.some((then) => then.status === 'failed')) {
      failures.push(`${spec.id} failed`)
    } else if (item.status === 'skipped') {
      gaps.push(`${spec.id} skipped`)
    } else if (item.status === 'flaky') {
      gaps.push(`${spec.id} flaky`)
    } else if (thens.some((then) => then.status === 'not_run')) {
      gaps.push(`${spec.id} has Then steps that did not run`)
    }
    summary.push({ case: spec.id, title: spec.title, status: item.status, ms: item.ms, thens, error: item.error })
  }

  const scope = input.cases ? 'the named cases' : "the check's selection"
  for (const id of parsed.cases.keys()) {
    if (!expected.some((spec) => spec.id === id)) gaps.push(`${id} is not in ${scope}`)
  }
  if (parsed.runErrors) gaps.push(`${parsed.runErrors} run-level error(s)`)
  if (expected.length === 0) gaps.push(`${scope} is empty`)
  const versionGap = input.skipVersions ? null : versionsMatch(input.deployedStart, input.deployedEnd)
  if (versionGap) gaps.push(versionGap)

  if (failures.length) return { outcome: 'failed', reason: [...failures, ...gaps].join('; '), summary }
  if (input.exitCode !== 0) gaps.push(`exit code ${input.exitCode}`)
  if (gaps.length) return { outcome: 'incomplete', reason: gaps.join('; '), summary }
  return { outcome: 'passed', reason: null, summary }
}
