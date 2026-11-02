// Plain-text reports of a check's red cases that a person copies into their coding agent, which clears
// them. Everything the agent needs to trace a failure back to the run, the tested code and the case is in
// the text; the case's full Given/When/Then is in the project's catalog at the test commit.
import type { BugReport, CaseBug, CaseResult, CaseSpec, ThenStatus, Versions } from './types'

// The rules live in the assertchecks skill's cap7; the short form below is for an agent without it.
const instructions = (project: string) => [
  'Clear the red cases below by following the assertchecks skill\'s cap7, in this project\'s repository and with its own ticket workflow (in an IntentFold project: cap2, type fix).',
  'Without the skill: every case below ends repaired or with a developer, and you pass no analysis, options or routing question back to the person. Repair only in test scripts, fixtures and the case\'s own data, never in product code and never by asserting less; a repair counts after two consecutive passes by case ID with zero retries. A case you cannot make pass that way goes to its owner, who decides whether the product or the test changes. A case\'s written text changes only with its owner\'s approval.',
  'Give each case its own ticket: owners can differ. A repaired case\'s ticket closes when its repair lands; a handed-over case\'s ticket stays open. Assign by the project\'s rules or the person\'s instruction; otherwise use the workflow\'s default and list the tickets by module for the person to assign. Each case carries its written Given/When/Then and its latest failure; its test is assertchecks/tests/<case id>.spec.ts and its catalog entry is in assertchecks/e2e.json at the run\'s test commit. Put the run links, tested versions and case link in each ticket, and finish with two lists: repaired, and with a developer.',
  'Each case lists its tickets in AssertChecks, newest first. Never write to an existing ticket. Leave a case whose newest ticket is open, or closed with a fix this run does not contain (the deployed version for a product fix, the test commit for a test fix). Every other case is yours.',
  `Record each ticket on its case in AssertChecks with its client (/client/assertchecks.mjs): \`node assertchecks.mjs link --project ${project} --cases <ID,ID> --ticket <URL>\`. The client acts as the person signed in with \`node assertchecks.mjs login\`; when it is not signed in, run login and give the person the address it prints to approve.`,
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

// Every case that did not pass in the check's latest full run, each with enough to clear it.
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
