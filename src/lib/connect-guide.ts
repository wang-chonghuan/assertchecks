// How a project connects to AssertChecks: the homepage renders it, and "Copy for your agent" turns the
// same content into Markdown, so the page and the copied instructions can never disagree.
// Text uses `backticks` for inline code, which the page renders as code and Markdown keeps as is.

// The production origin, as in the client's default and the README.
export const ORIGIN = 'https://ca-assertchecks.kindsmoke-4d84c417.northeurope.azurecontainerapps.io'

export interface CodeSample { label: string; code: string; lang: string }

export interface ConnectStep {
  title: string
  text: string
  samples: CodeSample[]
}

export const FORMAT_LINKS = [
  { label: 'Catalog format', path: '/schemas/catalog.schema.json' },
  { label: 'Result format', path: '/schemas/result.schema.json' },
]

export const CONNECT_STEPS: ConnectStep[] = [
  {
    title: 'Create a check and keep its token',
    text: 'One check per environment, for example Staging. An AssertChecks administrator creates it; use `--period none` for a check that only runs on demand. The ping token is printed once: store it as the CI secret `ASSERTCHECKS_PING_TOKEN`, never in the repository.',
    samples: [{
      label: 'Administrator',
      lang: 'bash',
      code: `pnpm admin check:add shop staging --name "Staging" --env staging \\
  --period 86400 --grace 7200`,
    }],
  },
  {
    title: 'Write the catalog and name your tests by it',
    text: 'The catalog says what must hold, in the published catalog format. `active` cases are required; `draft` cases are listed but not run. `nightly` cases belong to every full run; `manual` cases run only when named. Optionally give a case one free-form `group` and comma-separated `tags`; they only organize and filter the results page. Projects may add their own fields. Start each test title with its case ID and each Then step with its Then ID.',
    samples: [
      {
        label: 'e2e.json',
        lang: 'json',
        code: `{
  "version": 1,
  "cases": [
    {
      "id": "E2E-001",
      "title": "Sign in with a saved account",
      "status": "active",
      "run": "nightly",
      "group": "Sign-in",
      "tags": "smoke,auth",
      "given": ["A registered account"],
      "when": ["Sign in through the login page"],
      "then": [
        { "id": "A1", "expect": "The dashboard greets the account holder" }
      ]
    }
  ]
}`,
      },
      {
        label: 'tests/E2E-001.spec.ts',
        lang: 'ts',
        code: `test('E2E-001: Sign in with a saved account', async ({ page }) => {
  // Given / When ...
  await test.step('Then A1: the dashboard greets the account holder', async () => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Welcome')
  })
})`,
      },
    ],
  },
  {
    title: 'Check it with a dry run',
    text: 'The dry run validates the catalog, and a result when given, against the published format and shows the outcome the check would give. It records nothing. Each wrong field is printed with its path.',
    samples: [{
      label: 'Dry run',
      lang: 'bash',
      code: `curl -fsSO ${ORIGIN}/client/assertchecks.mjs
node assertchecks.mjs check --catalog e2e.json
node assertchecks.mjs check --catalog e2e.json --playwright results.json --exit-code "$code"`,
    }],
  },
  {
    title: 'Report every run from CI',
    text: 'Download the client on every run so it always matches the server. Pass each tested component\'s version URL (JSON with a 40-character `sha`) to both calls: a run passes only when every version was recorded and unchanged. In GitHub Actions the client records the run link and whether the run was scheduled.',
    samples: [
      {
        label: 'CI step',
        lang: 'bash',
        code: `curl -fsSO ${ORIGIN}/client/assertchecks.mjs
export ASSERTCHECKS_PING_TOKEN="$YOUR_CI_SECRET"

run_id="$(node assertchecks.mjs start --version web=https://staging.example.com/version.json)"
PLAYWRIGHT_JSON_OUTPUT_NAME=results.json npx playwright test --reporter=json; code=$?
node assertchecks.mjs report --run-id "$run_id" --exit-code "$code" \\
  --playwright results.json --catalog e2e.json \\
  --version web=https://staging.example.com/version.json`,
      },
      { label: 'Partial run of named cases', lang: 'bash', code: 'node assertchecks.mjs start --cases E2E-014,E2E-031' },
      {
        label: 'No results',
        lang: 'bash',
        code: `node assertchecks.mjs report --run-id "$run_id" --exit-code "$code" \\
  --error "The browser could not start"`,
      },
    ],
  },
  {
    title: 'Open your project',
    text: 'Each environment card shows the last run, its counts and when the next run is due. Open an environment and it starts on the failed cases.',
    samples: [],
  },
]

export const FORMAT_INTRO = 'The client makes these calls for you. Any producer that is not a test runner can send the same JSON to `/api/ping/<token>/…` directly. A report that does not match the format is recorded as Incomplete, with every wrong field named.'

export const FORMAT_CALLS = [
  { method: 'start', title: 'A run began', text: 'The trigger, the named cases of a partial run, and each tested component\'s deployed SHA. Returns the run ID.' },
  { method: 'report', title: 'Here are the results', text: 'The catalog plus a result: Playwright\'s JSON report uploaded unchanged, or the cases format.' },
  { method: 'report', title: 'There are no results', text: 'Say why instead. The run is recorded as Incomplete, so a crash never looks like a pass.' },
  { method: 'check', title: 'Would this pass?', text: 'A dry run: validates the catalog and result, shows the outcome the check would give, and records nothing.' },
]

export const CASES_FORMAT: CodeSample = {
  label: 'result · cases format',
  lang: 'json',
  code: `{
  "format": "cases",
  "cases": [
    {
      "id": "E2E-001",
      "status": "passed",
      "ms": 5120,
      "thens": [{ "id": "A1", "status": "passed" }]
    }
  ]
}`,
}

export const PASS_RULE = 'IDs must match the catalog. A run passes only when every expected case reported, nothing was skipped or flaky, every Then passed, and each version was recorded and unchanged. Reports over 5 MB or containing credential-like text are rejected.'

const fence = (sample: CodeSample) => `${sample.label}:\n\n\`\`\`${sample.lang}\n${sample.code}\n\`\`\``

// The whole guide as Markdown for a coding agent to follow.
export function agentPrompt(): string {
  return [
    '# Connect this project to AssertChecks',
    '',
    `AssertChecks (${ORIGIN}) shows whether a project's end-to-end assertions hold. The project runs its own Playwright tests where it always runs them and reports every run; AssertChecks judges and displays it. If you have the \`assertchecks\` skill, its cap0 performs these steps.`,
    '',
    'Replace the example names, URLs and case IDs below with this project\'s own. Never commit the ping token.',
    '',
    '## Steps',
    ...CONNECT_STEPS.flatMap((step, index) => ['', `### ${index + 1}. ${step.title}`, '', step.text, ...step.samples.flatMap((sample) => ['', fence(sample)])]),
    '',
    '## Report format',
    '',
    FORMAT_INTRO.replace('`/api/ping/<token>/…`', `\`${ORIGIN}/api/ping/<token>/…\``),
    '',
    ...FORMAT_LINKS.map((link) => `- ${link.label}: ${ORIGIN}${link.path}`),
    ...FORMAT_CALLS.map((call) => `- \`POST /api/ping/<token>/${call.method}\` — ${call.title}: ${call.text}`),
    '',
    fence(CASES_FORMAT),
    '',
    PASS_RULE,
    '',
  ].join('\n')
}
