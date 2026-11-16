// A security test report is held as structured data (ASSERT-66); its Markdown download is generated
// here so there is one source of truth. The Markdown reads like an aggregated CI scan: findings are
// grouped under the scanner that surfaces them, and every scanner is listed (clean ones included).
import type { SecurityCounts, SecurityFinding, SecurityReport, SecuritySeverity } from './types'
import { SECURITY_TOOLS } from './security-tools'

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

function findingLine(finding: SecurityFinding): string {
  const ref = finding.ref ? ` Ref: [${finding.ref.label}](${finding.ref.url}).` : ''
  return `- **${finding.id} · ${LABEL[finding.severity]} · ${finding.area}** — ${finding.note}${ref}`
}

// A scanner's result as its nonzero severity counts, e.g. "2 low"; "No findings" when it found nothing.
function groupResult(findings: SecurityFinding[]): string {
  if (!findings.length) return 'No findings'
  const c = securityCounts(findings)
  return (['critical', 'high', 'medium', 'low'] as const).filter((k) => c[k] > 0).map((k) => `${c[k]} ${k}`).join(', ')
}

// The report as Markdown: a header table, the summary, a per-scanner tools table, the findings grouped
// by scanner, the release's security changes and the links. Generated from the structured report.
export function reportMarkdown(project: { name: string; slug: string }, report: SecurityReport): string {
  const counts = securityCounts(report.findings)
  const result = report.severity === 'pass'
    ? '**Pass** — no open findings'
    : `**${LABEL[report.severity]}** — ${countsLine(counts)}`
  const version = report.versionUrl ? `\`${report.version}\` ([version](${report.versionUrl}))` : `\`${report.version}\``
  // Group findings under the scanner that surfaces them.
  const byTool = new Map<string, SecurityFinding[]>()
  for (const f of report.findings) byTool.set(toolFor(f), [...(byTool.get(toolFor(f)) ?? []), f])

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
    '## Tools',
    '',
    '| Scanner | Coverage | Result |',
    '|---|---|---|',
  ]
  for (const tool of SECURITY_TOOLS) {
    lines.push(`| ${tool.name} | ${tool.category} | ${groupResult(byTool.get(tool.name) ?? [])} |`)
  }
  lines.push('', '## Findings by scanner', '')
  for (const tool of SECURITY_TOOLS) {
    const group = byTool.get(tool.name) ?? []
    lines.push(`### ${tool.name} — ${tool.category}`, '')
    if (group.length) for (const f of group) lines.push(findingLine(f))
    else lines.push('No findings.')
    lines.push('')
  }
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
