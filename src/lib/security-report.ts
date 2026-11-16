// A security test report is held as structured data (ASSERT-66); its Markdown download is generated
// here so there is one source of truth. The Markdown reads like an aggregated CI scan: findings are
// grouped under the scanner that surfaces them, and every scanner is listed (clean ones included).
import type { SecurityCounts, SecurityFinding, SecurityReport, SecuritySeverity } from './types'
import { SECURITY_TOOLS, type SecurityTool } from './security-tools'

const LABEL: Record<SecuritySeverity, string> = {
  pass: 'Pass',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

export function severityLabel(severity: SecuritySeverity): string {
  return LABEL[severity]
}

// Open findings of each severity. 'pass' findings are not counted (there should be none).
export function securityCounts(findings: SecurityFinding[]): SecurityCounts {
  const counts: SecurityCounts = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const finding of findings) {
    if (finding.severity !== 'pass') counts[finding.severity] += 1
  }
  return counts
}

// "0 critical, 0 high, 1 medium, 1 low" — the four counts in fixed order.
export function countsLine(counts: SecurityCounts): string {
  return `${counts.critical} critical, ${counts.high} high, ${counts.medium} medium, ${counts.low} low`
}

// A short, safe file name for the downloaded report.
export function reportFileName(projectSlug: string, version: string): string {
  const v = version.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 40)
  return `${projectSlug}-security-${v}.md`
}

// Which scanner surfaces a finding of each area, so the report reads like an aggregated CI scan.
const TOOL_FOR_AREA: Record<string, string> = {
  Dependencies: 'pnpm audit',
  'Error handling': 'Semgrep',
  Secrets: 'Gitleaks',
  'Response headers': 'Nuclei',
  Transport: 'Nuclei',
  'Session cookies': 'Nuclei',
  Caching: 'Nuclei',
  'Information disclosure': 'Nuclei',
  'Content integrity': 'Nuclei',
  CORS: 'Nuclei',
}
const DEFAULT_TOOL = 'Nuclei'

function toolFor(finding: SecurityFinding): string {
  return TOOL_FOR_AREA[finding.area] ?? DEFAULT_TOOL
}

// One finding as a Markdown block: the headline, then its impact, recommendation and reference.
function findingBlock(finding: SecurityFinding): string[] {
  const out = [
    `- **${finding.id} · ${LABEL[finding.severity]} · ${finding.area}** (${finding.status}) — ${finding.note}`,
  ]
  if (finding.impact) out.push(`  - *Impact:* ${finding.impact}`)
  if (finding.recommendation) out.push(`  - *Recommendation:* ${finding.recommendation}`)
  if (finding.ref) out.push(`  - *Reference:* [${finding.ref.label}](${finding.ref.url})`)
  return out
}

// A scanner's result as its nonzero severity counts, e.g. "2 low"; "No findings" when it found nothing.
export function groupResult(findings: SecurityFinding[]): string {
  if (!findings.length) return 'No findings'
  const c = securityCounts(findings)
  return (['critical', 'high', 'medium', 'low'] as const).filter((k) => c[k] > 0).map((k) => `${c[k]} ${k}`).join(', ')
}

export interface ScannerGroup {
  tool: SecurityTool
  findings: SecurityFinding[]
}

// Every scanner in order with the report's findings that it surfaces (empty when it found nothing), so
// the page and the Markdown present the same aggregated-scan shape from one place.
export function groupByScanner(findings: SecurityFinding[]): ScannerGroup[] {
  const byTool = new Map<string, SecurityFinding[]>()
  for (const f of findings) byTool.set(toolFor(f), [...(byTool.get(toolFor(f)) ?? []), f])
  return SECURITY_TOOLS.map((tool) => ({ tool, findings: byTool.get(tool.name) ?? [] }))
}

// The report as Markdown: a header table, the summary, a per-scanner tools table, the findings grouped
// by scanner, the release's security changes and the links. Generated from the structured report.
export function reportMarkdown(project: { name: string; slug: string }, report: SecurityReport): string {
  const counts = securityCounts(report.findings)
  const result = report.severity === 'pass'
    ? '**Pass** — no open findings'
    : `**${LABEL[report.severity]}** — ${countsLine(counts)}`
  const version = report.versionUrl ? `\`${report.version}\` ([version](${report.versionUrl}))` : `\`${report.version}\``
  const groups = groupByScanner(report.findings)

  const lines: string[] = [
    `# Security Test Report — ${project.name} · ${report.version}`,
    '',
    '| Field | Value |',
    '|---|---|',
    `| Product | ${project.name} (\`${project.slug}\`) |`,
    `| Version | ${version} |`,
    `| Environment | ${report.environment} |`,
    `| Assessed | ${report.assessedAt.slice(0, 10)} |`,
    `| Result | ${result} |`,
    '',
    '## Summary',
    '',
    report.summary,
    '',
    '## Scope & methodology',
    '',
    `This assessment covers the ${report.environment} release \`${report.version}\` of ${project.name}, `
      + 'across its web app and API. Security checks run automatically in CI on each release: dependency '
      + 'and container analysis, static code analysis, secret scanning, and a dynamic scan of the deployed '
      + 'URL. Findings are rated by severity and mapped to the OWASP Application Security Verification '
      + 'Standard (ASVS) and the OWASP Top 10. This is an automated release assessment, not a full manual '
      + 'penetration test.',
    '',
    '## Tools',
    '',
    '| Scanner | Version | Coverage | Result |',
    '|---|---|---|---|',
  ]
  for (const { tool, findings } of groups) {
    lines.push(`| ${tool.name} | ${tool.version} | ${tool.category} | ${groupResult(findings)} |`)
  }
  lines.push('', '## Findings by scanner', '')
  for (const { tool, findings } of groups) {
    lines.push(`### ${tool.name} ${tool.version} — ${tool.category}`, '')
    if (findings.length) for (const f of findings) lines.push(...findingBlock(f))
    else lines.push('No findings.')
    lines.push('')
  }
  const open = counts.critical + counts.high + counts.medium + counts.low
  lines.push('## Remediation', '', open > 0
    ? `${open} open observation${open === 1 ? '' : 's'}, each with its impact and recommendation above. `
      + 'Fold the header and configuration fixes into an upcoming release and keep any dependency '
      + 'advisories under watch; re-scan on the next release.'
    : 'No open findings in scope; continue the per-release scans.', '')
  lines.push('## Standards', '',
    '- OWASP ASVS — https://owasp.org/www-project-application-security-verification-standard/',
    '- OWASP Top 10 — https://owasp.org/www-project-top-ten/', '')
  if (report.changes.length) {
    lines.push('## Release security changes', '')
    for (const c of report.changes) lines.push(`- [${c.label}](${c.url})`)
    lines.push('')
  }
  if (report.links.length) {
    lines.push('## Links', '')
    for (const l of report.links) lines.push(`- ${l.label} — ${l.url}`)
    lines.push('')
  }
  lines.push('---', `Assessed ${report.assessedAt.slice(0, 10)} · next review on the following release.`)
  return lines.join('\n')
}
