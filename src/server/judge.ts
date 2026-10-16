// Pure parsing and judgement of an IntentGuard run. No I/O, so it is testable with real reports.

export type Outcome = 'running' | 'passed' | 'failed' | 'incomplete'
export type ThenStatus = 'passed' | 'failed' | 'not_run'
export type CaseStatus = 'passed' | 'failed' | 'skipped' | 'flaky' | 'missing'

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

export interface Deployed {
  web: string | null
  api: string | null
}

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

interface PwStep {
  title: string
  error?: unknown
  steps?: PwStep[]
}

interface PwResult {
  status: string
  duration: number
  error?: { message?: string }
  errors?: { message?: string }[]
  steps?: PwStep[]
}

interface PwTest {
  status: string
  results: PwResult[]
}

interface PwSpec {
  title: string
  tests: PwTest[]
}

interface PwSuite {
  specs?: PwSpec[]
  suites?: PwSuite[]
}

const CASE_TITLE = /^([A-Z0-9]+(?:-[A-Z0-9]+)*):/
const THEN_TITLE = /^Then ([A-Za-z0-9]+):/
const SENSITIVE = [/\bAuthorization\b/, /Bearer\s/, /eyJ[A-Za-z0-9_-]{5,}\.eyJ[A-Za-z0-9_-]{5,}/]
const ERROR_LIMIT = 600

export function containsSensitive(text: string): boolean {
  return SENSITIVE.some((pattern) => pattern.test(text))
}

export function expectedCases(catalog: unknown): CatalogCase[] {
  const cases = (catalog as { cases?: unknown })?.cases
  if (!Array.isArray(cases)) throw new Error('catalog has no cases array')
  return (cases as CatalogCase[]).filter((item) => item.status === 'active' && item.run === 'nightly')
}

function cleanError(message: string | undefined): string | null {
  if (!message) return null
  // Strip ANSI colour codes emitted by Playwright.
  const text = message.replace(/\u001b\[[0-9;]*m/g, '').trim()
  return text.length > ERROR_LIMIT ? `${text.slice(0, ERROR_LIMIT)}…` : text
}

function collectThens(steps: PwStep[] | undefined, found: Map<string, ThenStatus>): void {
  for (const step of steps ?? []) {
    const match = THEN_TITLE.exec(step.title)
    if (match) found.set(match[1], step.error ? 'failed' : 'passed')
    collectThens(step.steps, found)
  }
}

interface ParsedCase {
  title: string
  testStatus: string
  result: PwResult | undefined
  thens: Map<string, ThenStatus>
}

function parseReport(report: unknown): Map<string, ParsedCase> {
  const suites = (report as { suites?: unknown })?.suites
  if (!Array.isArray(suites)) throw new Error('report has no suites array')
  const parsed = new Map<string, ParsedCase>()
  const walk = (suite: PwSuite) => {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const match = CASE_TITLE.exec(spec.title)
        if (!match) throw new Error(`test title without case ID: ${spec.title}`)
        if (parsed.has(match[1])) throw new Error(`case ${match[1]} appears more than once`)
        const result = test.results.at(-1)
        const thens = new Map<string, ThenStatus>()
        collectThens(result?.steps, thens)
        parsed.set(match[1], { title: spec.title, testStatus: test.status, result, thens })
      }
    }
    for (const child of suite.suites ?? []) walk(child)
  }
  for (const suite of suites as PwSuite[]) walk(suite)
  return parsed
}

function caseStatus(item: ParsedCase): CaseStatus {
  if (item.testStatus === 'skipped') return 'skipped'
  if (item.testStatus === 'flaky') return 'flaky'
  if (item.testStatus === 'expected') return 'passed'
  return 'failed'
}

export function judge(input: {
  report: unknown
  catalog: unknown
  exitCode: number
  deployedStart: Deployed | null
  deployedEnd: Deployed | null
}): Judgement {
  let expected: CatalogCase[]
  let parsed: Map<string, ParsedCase>
  try {
    expected = expectedCases(input.catalog)
    parsed = parseReport(input.report)
  } catch (error) {
    return { outcome: 'incomplete', reason: `Unparseable run: ${(error as Error).message}`, summary: [] }
  }

  const failures: string[] = []
  const gaps: string[] = []
  const summary: CaseResult[] = []

  for (const spec of expected) {
    const item = parsed.get(spec.id)
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
    const status = caseStatus(item)
    const thens: ThenResult[] = spec.then.map((then) => ({ id: then.id, status: item.thens.get(then.id) ?? 'not_run' }))
    for (const id of item.thens.keys()) {
      if (!spec.then.some((then) => then.id === id)) gaps.push(`${spec.id} reports undeclared Then ${id}`)
    }
    if (status === 'failed' || thens.some((then) => then.status === 'failed')) {
      failures.push(`${spec.id} failed`)
    } else if (status === 'skipped') {
      gaps.push(`${spec.id} skipped`)
    } else if (status === 'flaky') {
      gaps.push(`${spec.id} flaky`)
    } else if (thens.some((then) => then.status === 'not_run')) {
      gaps.push(`${spec.id} has Then steps that did not run`)
    }
    const result = item.result
    summary.push({
      case: spec.id,
      title: spec.title,
      status,
      ms: result ? Math.round(result.duration) : null,
      thens,
      error: cleanError(result?.error?.message ?? result?.errors?.[0]?.message),
    })
  }

  for (const id of parsed.keys()) {
    if (!expected.some((spec) => spec.id === id)) gaps.push(`${id} is not in the active nightly set`)
  }
  const globalErrors = (input.report as { errors?: unknown[] }).errors ?? []
  if (globalErrors.length) gaps.push(`${globalErrors.length} run-level error(s)`)
  if (expected.length === 0) gaps.push('active nightly set is empty')

  const { deployedStart: start, deployedEnd: end } = input
  if (!start?.web || !start.api || !end?.web || !end.api) {
    gaps.push('deployed SHA not recorded at start and end')
  } else if (start.web !== end.web || start.api !== end.api) {
    gaps.push('deployment changed during the run')
  }

  if (failures.length) return { outcome: 'failed', reason: [...failures, ...gaps].join('; '), summary }
  if (input.exitCode !== 0) gaps.push(`exit code ${input.exitCode}`)
  if (gaps.length) return { outcome: 'incomplete', reason: gaps.join('; '), summary }
  return { outcome: 'passed', reason: null, summary }
}
