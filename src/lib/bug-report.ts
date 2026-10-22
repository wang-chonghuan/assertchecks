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
const instructions = (project: string) => [
  'File bug tickets from the AssertChecks results below by following the assertchecks skill\'s cap7, in this project\'s repository and with its own ticket workflow (in an IntentFold project: cap2, type fix).',
  'Without the skill: every case below ends with a ticket on it, or listed for a person. Product defects get one fix ticket per cause; test defects get fix tickets for the tests; when product and test cannot be told apart, or a rule and the product disagree, file a ticket that states the open question with the evidence for each reading, for its owner to investigate.',
  'Each case carries its written Given/When/Then and its latest failure; its test is assertchecks/tests/<case id>.spec.ts and its catalog entry is in assertchecks/e2e.json at the run\'s test commit. Put the run links, tested versions and case links in each ticket, and finish with the tickets per owner.',
  'Each case lists its tickets in AssertChecks, newest first. Never write to an existing ticket. Newest ticket open: leave the case to it. Newest ticket closed: when this run contains its fix (the deployed version for a product fix, the test commit for a test fix), file a new ticket that links it; when it does not, leave it, the fix is not deployed yet; when you cannot tell, list the case for a person. No ticket: file one, or link the case to an open ticket that already covers the same cause.',
  `After filing a ticket, or choosing an open one for a case, record it in AssertChecks with its client (/client/assertchecks.mjs): \`node assertchecks.mjs link --project ${project} --cases <ID,ID> --ticket <URL>\`. The client acts as the person signed in with \`node assertchecks.mjs login\`; when it is not signed in, run login and give the person the address it prints to approve.`,
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

// Every case that did not pass in the check's latest full run, each with enough to file a ticket.
export function latestBugReport(origin: string, report: BugReport): string {
  const { project, check, run, cases } = report
  const head = `Project: ${project.name} · Check: ${check.name} (environment ${check.environment})`
  if (!run) return [...instructions(project.slug), '', head, 'No full run has reported results yet.'].join('\n')
  const caseLines = cases.flatMap((item, index) => [
    `${index + 1}. ${item.spec.id} — ${item.spec.title}`,
    `   Result: ${stopped(item.result)}`,
    `   Error: ${firstLines(item.result.error, 6)}`,
    ...(item.spec.failure ? [`   Known cause in the catalog: ${item.spec.failure}`] : []),
    ...ticketLines(item.bug, '   '),
    ...specLines(item.spec, item.result, '   '),
    `   Case link: ${caseLink(origin, project.slug, check.slug, item.spec.id, run.id)}`,
    '',
  ])
  return [
    ...instructions(project.slug),
    '',
    head,
    `Latest full run: #${run.id}, ${day(run.startedAt)}, ${run.trigger === 'schedule' ? 'scheduled' : 'manual'}, test commit ${run.testSha ?? 'not recorded'}, deployed ${versionText(run.deployed)}: ${runLink(origin, project.slug, check.slug, run.id)}`,
    '',
    `Cases that did not pass in it (${cases.length}):`,
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
    ...instructions(context.project.slug),
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
