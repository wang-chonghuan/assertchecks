// Plain-text bug reports a person copies into their coding agent, which files the tickets. Everything
// the agent needs to trace a failure back to the run, the tested code and the case is in the text; the
// case's full Given/When/Then is in the project's catalog at the test commit.
import type { BugReport, CaseBug, CaseResult, CaseSpec, RunRow, ThenStatus, Versions } from './types'

interface RunContext {
  origin: string
  project: { slug: string; name: string }
  check: { slug: string; name: string; environment?: string }
  run: RunRow & { caseCount?: number | null }
  deployed: Versions | null
}

// The rules live in the assertchecks skill's cap7; the short form below is for an agent without it.
const INSTRUCTIONS = [
  'File bug tickets from the AssertChecks results below by following the assertchecks skill\'s cap7, in this project\'s repository and with its own ticket workflow (in an IntentFold project: cap2, type fix).',
  'Without the skill: every case must end in a ticket. Product defects get one fix ticket per cause; test defects get fix tickets for the tests; when product and test cannot be told apart, or a rule and the product disagree, file a ticket that states the open question with the evidence for each reading, for its owner to investigate. Add evidence to an open ticket that already covers a cause instead of filing another, and check a closed one against the failing run\'s deployed version before reopening it.',
  'Each case carries its written Given/When/Then and its latest failure; its test is assertchecks/tests/<case id>.spec.ts and its catalog entry is in assertchecks/e2e.json at the run\'s test commit. Put the run links, tested versions and case links in each ticket, and finish with the tickets per owner.',
  'Each case says whether AssertChecks has it in progress, with its tickets newest first. A case in progress gets new evidence on its newest ticket, not another ticket. A case that needs a ticket gets a new one; when it failed again after an earlier ticket had fixed it, link that earlier ticket in the new one.',
  'After creating or updating a ticket, record it in AssertChecks: with this check\'s ping token in the environment variable ASSERTCHECKS_PING_TOKEN (never on the command line), run `node assertchecks.mjs link --cases <ID,ID> --ticket <URL>` (the client is at /client/assertchecks.mjs). Without the token, list those commands for a person to run.',
]

const day = (iso: string) => `${iso.slice(0, 16).replace('T', ' ')} UTC`
const versionText = (deployed: Versions | null) => deployed && Object.keys(deployed).length
  ? Object.keys(deployed).sort().map((name) => `${name} ${deployed[name] ?? 'not recorded'}`).join(', ')
  : 'not recorded'
const runLink = (origin: string, project: string, check: string, run: string) => `${origin}/p/${project}/checks/${check}?run=${run}`
const caseLink = (origin: string, project: string, check: string, id: string, run: string) =>
  `${origin}/p/${project}/checks/${check}/cases/${id}?run=${run}`

const STATUS: Record<CaseBug['status'], string> = {
  'needs-ticket': 'needs a ticket',
  'in-progress': 'in progress',
  fixed: 'fixed',
}

// A case's tickets as the agent needs them: its status in AssertChecks and its tickets, newest first.
function ticketLines(bug: CaseBug | null, indent: string): string[] {
  if (!bug || !bug.tickets.length) return [`${indent}Tickets in AssertChecks: none`]
  return [
    `${indent}In AssertChecks: ${STATUS[bug.status]}${bug.previous ? ` (failed again after ${bug.previous} had fixed it)` : ''}; tickets, newest first:`,
    ...bug.tickets.map((ticket) => `${indent}- ${ticket.url} — attached ${day(ticket.at)} by ${ticket.by}`),
  ]
}

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
      ...ticketLines(item.bug, '   '),
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
  bug: CaseBug | null
}): string {
  const { spec, result, history, bug } = context
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
    ...ticketLines(bug, ''),
    ...specLines(spec, result, ''),
    `Error: ${firstLines(result?.error ?? null, 40)}`,
    ...(history.length ? [`Recent runs: ${history.map((item) => `#${item.runId} ${item.status}`).join(', ')}`] : []),
  ].join('\n')
}
