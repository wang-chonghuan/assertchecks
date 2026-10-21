// Plain-text bug reports a person copies into their coding agent, which files the tickets. Everything
// the agent needs to trace a failure back to the run, the tested code and the case is in the text; the
// case's full Given/When/Then is in the project's catalog at the test commit.
import type { BugReport, CaseResult, CaseSpec, RunRow, ThenStatus, Versions } from './types'

interface RunContext {
  origin: string
  project: { slug: string; name: string }
  check: { slug: string; name: string; environment?: string }
  run: RunRow & { caseCount?: number | null }
  deployed: Versions | null
}

const INSTRUCTIONS = [
  'You are in this project\'s repository. File one fix ticket per distinct product defect from the AssertChecks results below, using the project\'s own ticket workflow (in an IntentFold project: cap2, type fix).',
  '- Cases that fail for the same cause share one ticket.',
  '- Each case below carries its written Given/When/Then and its latest failure. Its test is assertchecks/tests/<case id>.spec.ts and its catalog entry is in assertchecks/e2e.json; read them at the run\'s test commit when you need the exact assertion.',
  '- A case that did not pass in some runs and passed in others is intermittent: file it when the product is at fault, and say how often it failed.',
  '- A failure caused by the test itself or by an unstable model judgement is not a product defect: list those at the end with your reason instead of filing them.',
  '- Put the run link, the tested versions and the case link in each ticket.',
]

const day = (iso: string) => `${iso.slice(0, 16).replace('T', ' ')} UTC`
const versionText = (deployed: Versions | null) => deployed && Object.keys(deployed).length
  ? Object.keys(deployed).sort().map((name) => `${name} ${deployed[name] ?? 'not recorded'}`).join(', ')
  : 'not recorded'
const runLink = (origin: string, project: string, check: string, run: string) => `${origin}/p/${project}/checks/${check}?run=${run}`
const caseLink = (origin: string, project: string, check: string, id: string, run: string) =>
  `${origin}/p/${project}/checks/${check}/cases/${id}?run=${run}`

function runLines({ origin, project, check, run, deployed }: RunContext): string[] {
  const kind = run.caseCount ? `${run.caseCount} named cases` : run.trigger === 'schedule' ? 'scheduled' : 'manual'
  return [
    `Project: ${project.name} · Check: ${check.name}${check.environment ? ` (environment ${check.environment})` : ''}`,
    `Run: #${run.id}, ${day(run.startedAt)}, ${kind}, outcome ${run.outcome}`,
    `Run link: ${runLink(origin, project.slug, check.slug, run.id)}`,
    `Test commit: ${run.testSha ?? 'not recorded'}`,
    `Deployed at start: ${versionText(deployed)}`,
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

function specLines(spec: CaseSpec, result: CaseResult | null, indent: string): string[] {
  const thenStatus = new Map((result?.thens ?? []).map((then) => [then.id, then.status]))
  const failed = result !== null && (result.status !== 'passed' || result.thens.some((then) => then.status === 'failed'))
  return [
    `${indent}Given:`, ...spec.given.map((step) => `${indent}- ${step}`),
    `${indent}When:`, ...spec.when.map((step) => `${indent}- ${step}`),
    `${indent}Then:`, ...spec.then.map((then) => `${indent}- ${then.id} [${thenWord(thenStatus.get(then.id) ?? 'not_run', failed)}]: ${then.expect}`),
  ]
}

// Every case that did not pass in the check's recent full runs, each with enough to file a ticket.
export function recentBugReport(origin: string, report: BugReport): string {
  const { project, check, runs, cases } = report
  const runOf = new Map(runs.map((run) => [run.id, run]))
  const caseLines = cases.flatMap((item, index) => {
    const run = runOf.get(item.last.runId)!
    return [
      `${index + 1}. ${item.spec.id} — ${item.spec.title}`,
      `   Did not pass in: ${item.notPassedIn.map((id) => `#${id}`).join(', ')} (${item.notPassedIn.length} of the ${item.ranIn} recent full runs it ran in); newest run: ${item.newest}`,
      `   Latest failure, run #${run.id} (${day(run.startedAt)}, test commit ${run.testSha ?? 'not recorded'}): ${stopped(item.last.result)}`,
      `   Error: ${firstLines(item.last.result.error, 6)}`,
      ...(item.spec.failure ? [`   Known cause in the catalog: ${item.spec.failure}`] : []),
      ...specLines(item.spec, item.last.result, '   '),
      `   Case link: ${caseLink(origin, project.slug, check.slug, item.spec.id, run.id)}`,
      '',
    ]
  })
  return [
    ...INSTRUCTIONS,
    '',
    `Project: ${project.name} · Check: ${check.name} (environment ${check.environment})`,
    `Recent full runs, newest first:`,
    ...runs.map((run) => `- #${run.id}, ${day(run.startedAt)}, ${run.trigger === 'schedule' ? 'scheduled' : 'manual'}, test commit ${run.testSha ?? 'not recorded'}, deployed ${versionText(run.deployed)}: ${runLink(origin, project.slug, check.slug, run.id)}`),
    '',
    `Cases that did not pass in at least one of them (${cases.length}):`,
    '',
    ...caseLines,
  ].join('\n').trimEnd()
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
  const failed = result !== null && (result.status !== 'passed' || result.thens.some((then) => then.status === 'failed'))
  return [
    ...INSTRUCTIONS,
    '',
    ...runLines(context),
    '',
    `Case: ${spec.id} — ${spec.title}`,
    `Case link: ${caseLink(context.origin, context.project.slug, context.check.slug, spec.id, context.run.id)}`,
    `Result in this run: ${result ? (failed ? 'did not pass' : 'passed') : 'not in this run'}${result && failed ? ` (${stopped(result)})` : ''}`,
    ...(spec.failure ? [`Known cause in the catalog: ${spec.failure}`] : []),
    ...specLines(spec, result, ''),
    `Error: ${firstLines(result?.error ?? null, 40)}`,
    ...(history.length ? [`Recent runs: ${history.map((item) => `#${item.runId} ${item.status}`).join(', ')}`] : []),
  ].join('\n')
}
