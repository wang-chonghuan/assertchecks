// The open-source security testing tools shown in the security-live card's toolset popup (ASSERT-66).
// This is the stated toolset; wiring each one into CI per release is ASSERT-67.
export interface SecurityTool {
  name: string
  // What kind of check it is.
  category: string
  // One line on what it looks for.
  checks: string
  url: string
}

export const SECURITY_TOOLS: SecurityTool[] = [
  { name: 'pnpm audit', category: 'Dependencies', checks: 'Known CVEs in the dependency tree', url: 'https://pnpm.io/cli/audit' },
  { name: 'Semgrep', category: 'Static analysis', checks: 'Insecure code patterns: injection, auth, unsafe APIs', url: 'https://semgrep.dev' },
  { name: 'Gitleaks', category: 'Secrets', checks: 'Leaked keys and tokens in code and history', url: 'https://github.com/gitleaks/gitleaks' },
  { name: 'Trivy', category: 'Dependencies & containers', checks: 'Dependency, container image and IaC vulnerabilities', url: 'https://trivy.dev' },
  { name: 'Nuclei', category: 'Dynamic', checks: 'Template-based scan of the deployed URL', url: 'https://github.com/projectdiscovery/nuclei' },
]
