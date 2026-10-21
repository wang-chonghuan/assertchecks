// Plain-text bug reports a person copies into their coding agent, which files the tickets. Everything
// the agent needs to trace a failure back to the run, the tested code and the case is in the text; the
// case's full Given/When/Then is in the project's catalog at the test commit.
import type { CaseResult, CaseSpec, RunRow, ThenStatus, Versions } from './types'

interface RunContext {
  origin: string
  project: { slug: string; name: string }
  check: { slug: string; name: string; environment?: string }
  run: RunRow & { caseCount?: number | null }
  deployed: Versions | null
}

const INSTRUCTIONS = [
  'File bug tickets in this project\'s tracker from the AssertChecks results below.',
  '- One ticket per distinct defect: cases that fail for the same cause share one ticket.',
  '- Before writing a ticket, read the case\'s Given/When/Then in the project\'s catalog at the test commit and check the error against it.',
  '- A failure caused by the test itself or by an unstable judgement is not a product bug: list those separately with your reason instead of filing them.',
  '- Include the run link, the tested versions and the case links in each ticket.',
]

function runLines({ origin, project, check, run, deployed }: RunContext): string[] {
  const versions = deployed && Object.keys(deployed).length
    ? Object.keys(deployed).sort().map((name) => `${name} ${deployed[name] ?? 'not recorded'}`).join(', ')
    : 'not recorded'
  const kind = run.caseCount ? `${run.caseCount} named cases` : run.trigger === 'schedule' ? 'scheduled' : 'manual'
  return [
    `Project: ${project.name} · Check: ${check.name}${check.environment ? ` (environment ${check.environment})` : ''}`,
    `Run: #${run.id}, ${run.startedAt.slice(0, 16).replace('T', ' ')} UTC, ${kind}, outcome ${run.outcome}`,
    `Run link: ${origin}/p/${project.slug}/checks/${check.slug}?run=${run.id}`,
    `Test commit: ${run.testSha ?? 'not recorded'}`,
    `Deployed at start: ${versions}`,
  ]
}

function stopped(item: CaseResult): string {
  const failed = item.thens.filter((then) => then.status === 'failed').map((then) => then.id)
  if (failed.length) return `Then ${failed.join(', ')} failed`
  if (item.status !== 'passed' && item.thens.every((then) => then.status === 'not_run')) return 'stopped before its first Then'
  return `case ${item.status}; Thens not reported: ${item.thens.filter((then) => then.status !== 'passed').map((then) => then.id).join(', ')}`
}

function firstLines(error: string | null, lines: number): string {
  if (!error) return 'none reported'
  return error.replace(/^\s*Error:\s*/, '').split('\n').map((line) => line.trimEnd()).filter((line) => line.trim())
    .slice(0, lines).join('\n   ')
}

// Every case of the shown run that did not pass, or the subset the page is filtered to.
export function runBugReport(context: RunContext & {
  cases: CaseResult[]
  ranCount: number
  knownCause: Record<string, string>
  recentFailures: Record<string, { notPassed: number; runs: number }>
  filtered: boolean
}): string {
  const { origin, project, check, run, cases, knownCause, recentFailures } = context
  const caseLines = cases.flatMap((item, index) => {
    const recent = recentFailures[item.case]
    return [
      `${index + 1}. ${item.case} — ${item.title.replace(/^[A-Z0-9-]+:\s*/, '')}`,
      `   Where it stopped: ${stopped(item)}`,
      `   Error: ${firstLines(item.error, 3)}`,
      ...(knownCause[item.case] ? [`   Known cause in the catalog: ${knownCause[item.case]}`] : []),
      ...(recent && recent.runs > 1 ? [`   Recent full runs: did not pass in ${recent.notPassed} of the last ${recent.runs}`] : []),
      `   Case link: ${origin}/p/${project.slug}/checks/${check.slug}/cases/${item.case}?run=${run.id}`,
    ]
  })
  return [
    ...INSTRUCTIONS,
    '',
    ...runLines(context),
    `Result: ${cases.length} of ${context.ranCount} cases tested did not pass${context.filtered ? ' (only the cases matching the page filter are listed)' : ''}`,
    '',
    'Cases that did not pass:',
    ...caseLines,
  ].join('\n')
}

// A Then that never executed was not reached when the case failed earlier, otherwise not reported.
function thenWord(status: ThenStatus, caseFailed: boolean): string {
  if (status === 'passed') return 'passed'
  if (status === 'failed') return 'FAILED'
  return caseFailed ? 'not reached' : 'not reported'
}

// One case in one run, with its full written expectation and error.
export function caseBugReport(context: RunContext & {
  spec: CaseSpec
  result: CaseResult | null
  history: { runId: string; status: string }[]
}): string {
  const { spec, result, history } = context
  const thenStatus = new Map((result?.thens ?? []).map((then) => [then.id, then.status]))
  const failed = result !== null && (result.status !== 'passed' || result.thens.some((then) => then.status === 'failed'))
  return [
    ...INSTRUCTIONS,
    '',
    ...runLines(context),
    '',
    `Case: ${spec.id} — ${spec.title}`,
    `Case link: ${context.origin}/p/${context.project.slug}/checks/${context.check.slug}/cases/${spec.id}?run=${context.run.id}`,
    `Result in this run: ${result ? (result.status === 'passed' && result.thens.some((then) => then.status === 'failed') ? 'failed' : result.status) : 'not in this run'}`,
    ...(spec.failure ? [`Known cause in the catalog: ${spec.failure}`] : []),
    'Given:',
    ...spec.given.map((step) => `- ${step}`),
    'When:',
    ...spec.when.map((step) => `- ${step}`),
    'Then:',
    ...spec.then.map((then) => `- ${then.id} [${thenWord(thenStatus.get(then.id) ?? 'not_run', failed)}]: ${then.expect}`),
    `Error: ${firstLines(result?.error ?? null, 40)}`,
    ...(history.length ? [`Recent runs: ${history.map((item) => `#${item.runId} ${item.status}`).join(', ')}`] : []),
  ].join('\n')
}
