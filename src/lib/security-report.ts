// A security test report is held as structured data (ASSERT-66); its Markdown download is generated
// here so there is one source of truth. Shared by the server (never) and the page (download button).
import type { SecurityCounts, SecurityFinding, SecurityReport, SecuritySeverity } from './types'

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

function findingLine(finding: SecurityFinding): string {
  const ref = finding.ref ? ` Ref: [${finding.ref.label}](${finding.ref.url}).` : ''
  return `**${finding.id} · ${LABEL[finding.severity]} · ${finding.area}** — ${finding.note}${ref}`
}

// The report as Markdown, in the format reviewed with the owner: a header table, summary, a findings
// table with details, the release's security changes, and the links. Generated, never stored.
export function reportMarkdown(project: { name: string; slug: string }, report: SecurityReport): string {
  const counts = securityCounts(report.findings)
  const result = report.severity === 'pass'
    ? '**Pass** — no open findings'
    : `**${LABEL[report.severity]}** — ${countsLine(counts)}`
  const version = report.versionUrl ? `\`${report.version}\` ([version](${report.versionUrl}))` : `\`${report.version}\``
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
  ]
  if (report.findings.length) {
    lines.push('## Findings', '', '| ID | Severity | Area | Status |', '|---|---|---|---|')
    for (const f of report.findings) lines.push(`| ${f.id} | ${LABEL[f.severity]} | ${f.area} | ${f.status} |`)
    lines.push('')
    for (const f of report.findings) lines.push(findingLine(f), '')
  } else {
    lines.push('## Findings', '', 'No open findings in scope.', '')
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
