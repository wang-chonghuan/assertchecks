// The open-source security testing tools shown in the security-live card's toolset popup (ASSERT-66).
// This is the stated toolset; wiring each one into CI per release is ASSERT-67.
export interface SecurityTool {
  name: string
  // The pinned tool version (the latest release before 2026-04-01).
  version: string
  // What kind of check it is.
  category: string
  // One line on what it looks for.
  checks: string
  url: string
}

export const SECURITY_TOOLS: SecurityTool[] = [
  { name: 'pnpm audit', version: '10.33.0', category: 'Dependencies', checks: 'Known CVEs in the dependency tree', url: 'https://pnpm.io/cli/audit' },
  { name: 'Semgrep', version: '1.157.0', category: 'Static analysis', checks: 'Insecure code patterns: injection, auth, unsafe APIs', url: 'https://semgrep.dev' },
  { name: 'Gitleaks', version: '8.30.1', category: 'Secrets', checks: 'Leaked keys and tokens in code and history', url: 'https://github.com/gitleaks/gitleaks' },
  { name: 'Trivy', version: '0.69.3', category: 'Dependencies & containers', checks: 'Dependency, container image and IaC vulnerabilities', url: 'https://trivy.dev' },
  { name: 'Nuclei', version: '3.7.1', category: 'Dynamic', checks: 'Template-based scan of the deployed URL', url: 'https://github.com/projectdiscovery/nuclei' },
]
