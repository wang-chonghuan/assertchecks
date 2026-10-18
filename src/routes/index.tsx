import { createFileRoute } from '@tanstack/react-router'
import { Alert, Button, Card, Col, Flex, Row, Steps, Tag, Typography, theme } from 'antd'
import {
  ApiOutlined,
  ArrowRightOutlined,
  BellOutlined,
  ClockCircleOutlined,
  CloudServerOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  HistoryOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import type { ReactNode } from 'react'
import { getMe } from '../server/fns'
import { Brand, PRODUCT_NAME } from '../components/brand'
import { CheckSummary } from '../components/check-summary'
import { CheckStatusTag, ThenTag } from '../components/status'
import { CodeBlock } from '../components/code-block'
import type { CheckCard } from '../lib/types'

export const Route = createFileRoute('/')({
  loader: async () => ({ me: await getMe() }),
  head: () => ({ meta: [{ title: `${PRODUCT_NAME} · End-to-end assertion monitoring` }] }),
  component: HomePage,
})

// The production origin, as in the client's default and the README.
const ORIGIN = 'https://ca-assertchecks.kindsmoke-4d84c417.northeurope.azurecontainerapps.io'

// An illustration of the real environment card. Not stored anywhere; times are fixed so server and
// client render identical text.
const EXAMPLE: CheckCard = {
  slug: 'staging',
  name: 'Staging',
  environment: 'staging',
  periodSeconds: 86400,
  graceSeconds: 7200,
  status: 'failing',
  nextExpectedAt: '2026-10-19T05:00:00.000Z',
  latest: {
    id: 'example',
    startedAt: '2026-10-18T03:00:04.000Z',
    finishedAt: '2026-10-18T03:14:41.000Z',
    outcome: 'failed',
    timedOut: false,
    reason: null,
    exitCode: 1,
    testSha: null,
    trigger: 'schedule',
  },
  active: null,
  partial: null,
  notPassed: [],
  outsideRun: [],
  counts: { total: 48, passed: 41, failed: 2, draft: 4, manual: 1 },
  catalogChanges: [],
}

const EXAMPLE_FAILURES = [
  { id: 'E2E-014', title: 'Refund a card payment', then: 'A2' },
  { id: 'E2E-031', title: 'Export statements as CSV', then: 'A1' },
]

const CHECK_COMMAND = `pnpm admin check:add shop staging --name "Staging" --env staging \\
  --period 86400 --grace 7200`

const CATALOG = `{
  "version": 1,
  "cases": [
    {
      "id": "E2E-001",
      "title": "Sign in with a saved account",
      "status": "active",
      "run": "nightly",
      "given": ["A registered account"],
      "when": ["Sign in through the login page"],
      "then": [
        { "id": "A1", "expect": "The dashboard greets the account holder" }
      ]
    }
  ]
}`

const TEST = `test('E2E-001: Sign in with a saved account', async ({ page }) => {
  // Given / When ...
  await test.step('Then A1: the dashboard greets the account holder', async () => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Welcome')
  })
})`

const REPORT = `curl -fsSO ${ORIGIN}/client/assertchecks.mjs
export ASSERTCHECKS_PING_TOKEN="$YOUR_CI_SECRET"

run_id="$(node assertchecks.mjs start --version web=https://staging.example.com/version.json)"
PLAYWRIGHT_JSON_OUTPUT_NAME=results.json npx playwright test --reporter=json; code=$?
node assertchecks.mjs report --run-id "$run_id" --exit-code "$code" \\
  --playwright results.json --catalog e2e.json \\
  --version web=https://staging.example.com/version.json`

const PARTIAL = `node assertchecks.mjs start --cases E2E-014,E2E-031`

const ERROR = `node assertchecks.mjs report --run-id "$run_id" --exit-code "$code" \\
  --error "The browser could not start"`

const DRY_RUN = `node assertchecks.mjs check --catalog e2e.json \\
  --playwright results.json --exit-code "$code"`

const CASES_FORMAT = `{
  "format": "cases",
  "cases": [
    {
      "id": "E2E-001",
      "status": "passed",
      "ms": 5120,
      "thens": [{ "id": "A1", "status": "passed" }]
    }
  ]
}`

function HomePage() {
  const { me } = Route.useLoaderData()
  const { token } = theme.useToken()

  const primary = (
    <Button type="primary" size="large" href={me ? '/p' : '/login'} icon={<ArrowRightOutlined />} iconPlacement="end">
      {me ? 'Open my projects' : 'Sign in'}
    </Button>
  )

  const container = { boxSizing: 'border-box' as const, width: '100%', maxWidth: token.screenXL, marginInline: 'auto', paddingInline: token.padding }
  const section = { ...container, paddingBlock: token.paddingXL * 2 }

  return (
    <div style={{ minHeight: '100vh', background: token.colorBgContainer }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: `color-mix(in srgb, ${token.colorBgContainer} 82%, transparent)`,
          backdropFilter: 'blur(12px)',
          borderBottom: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
        }}
      >
        <Flex align="center" gap="middle" style={{ ...container, height: token.controlHeightLG * 1.6 }}>
          <Typography.Text strong style={{ fontSize: token.fontSizeLG }}><Brand /></Typography.Text>
          <Flex flex={1} justify="end" align="center" gap="small">
            {/* Section links need room; the stylesheet shows them from the md breakpoint so SSR renders them too. */}
            <nav className="home-nav">
              <Button type="text" href="#checks">What it checks</Button>
              <Button type="text" href="#connect">Connect</Button>
              <Button type="text" href="#format">Report format</Button>
            </nav>
            <Button type={me ? 'primary' : 'default'} href={me ? '/p' : '/login'}>{me ? 'My projects' : 'Sign in'}</Button>
          </Flex>
        </Flex>
      </header>

      <main>
        {/* Hero */}
        <div
          style={{
            background: [
              `radial-gradient(60% 70% at 90% 0%, ${token.colorPrimaryBg} 0%, transparent 70%)`,
              `radial-gradient(50% 60% at 0% 100%, ${token.purple1} 0%, transparent 70%)`,
              `radial-gradient(${token.colorBorderSecondary} 1px, transparent 1px) 0 0 / ${token.sizeLG}px ${token.sizeLG}px`,
              token.colorBgLayout,
            ].join(', '),
            borderBottom: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
          }}
        >
          <Row gutter={[token.marginXL, token.marginXL]} align="middle" style={{ ...section, marginInline: 'auto' }}>
            <Col xs={24} lg={13}>
              <Flex vertical gap="large" align="start">
                <Tag color="blue" variant="filled" style={{ marginInlineEnd: 0, fontSize: token.fontSize, paddingBlock: token.paddingXXS, paddingInline: token.paddingSM }}>
                  End-to-end assertion monitoring
                </Tag>
                <Typography.Title
                  level={1}
                  style={{
                    margin: 0,
                    fontSize: `clamp(${token.fontSizeHeading2}px, 5.4vw, ${Number(token.fontSizeHeading1) * 1.55}px)`,
                    lineHeight: 1.08,
                    letterSpacing: '-0.025em',
                  }}
                >
                  Know every assertion{' '}
                  <span
                    style={{
                      background: `linear-gradient(90deg, ${token.colorPrimary}, ${token.purple6})`,
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: 'transparent',
                    }}
                  >
                    still holds.
                  </span>
                </Typography.Title>
                <Typography.Paragraph style={{ margin: 0, fontSize: token.fontSizeHeading5, color: token.colorTextSecondary, maxWidth: 560 }}>
                  Your end-to-end tests keep running in your own CI. After each run, your runner reports to {PRODUCT_NAME},
                  which checks that it ran on time, ran in full, and that every assertion passed, then shows exactly which
                  case and which assertion broke.
                </Typography.Paragraph>
                <Flex gap="small" wrap>
                  {primary}
                  <Button size="large" href="#connect">How to connect</Button>
                </Flex>
                <Flex gap="large" wrap>
                  {['Push only', 'Never runs your tests', 'Holds no product credentials'].map((item) => (
                    <Typography.Text key={item} type="secondary">
                      <SafetyCertificateOutlined style={{ color: token.colorSuccess, marginInlineEnd: token.marginXXS }} />
                      {item}
                    </Typography.Text>
                  ))}
                </Flex>
              </Flex>
            </Col>
            <Col xs={24} lg={11} style={{ minWidth: 0 }}>
              <ExampleCard />
            </Col>
          </Row>
        </div>

        {/* What it checks */}
        <div id="checks" style={{ ...section, scrollMarginTop: token.controlHeightLG * 1.6 }}>
          <SectionTitle
            eyebrow="What it checks"
            title="Three questions after every run"
            text={`healthchecks.io tells you a job ran. ${PRODUCT_NAME} also tells you whether it ran everything it should, and whether every declared assertion held.`}
          />
          <Row gutter={[token.marginLG, token.marginLG]}>
            <Col xs={24} md={8}>
              <Pillar
                icon={<ClockCircleOutlined />}
                color={token.colorWarning}
                bg={token.colorWarningBg}
                title="On time"
                text="Each check expects a run on its schedule. If a scheduled run has not arrived when its grace period ends, the check turns Late. Manual runs never hide a missing scheduled one, and manual-only checks are never late."
              />
            </Col>
            <Col xs={24} md={8}>
              <Pillar
                icon={<FileDoneOutlined />}
                color={token.colorPrimary}
                bg={token.colorPrimaryBg}
                title="Complete"
                text="Results are compared with your catalog. If an expected case did not run, was skipped, or was flaky, or a tested version changed mid-run, the run is Incomplete. It is never shown as Passed."
              />
            </Col>
            <Col xs={24} md={8}>
              <Pillar
                icon={<SafetyCertificateOutlined />}
                color={token.colorError}
                bg={token.colorErrorBg}
                title="Correct"
                text="Every case lists its Then assertions. One failed assertion fails the run, and the environment page opens on the failed cases, with the Then that broke and its error."
              />
            </Col>
          </Row>
          <Card style={{ marginTop: token.marginXL }} styles={{ body: { padding: token.paddingLG } }}>
            <Typography.Title level={5} style={{ marginTop: 0 }}>How one run flows</Typography.Title>
            <Steps
              current={5}
              size="small"
              items={[
                { title: 'Start', content: 'Your runner reports that a run began, with the deployed versions.' },
                { title: 'Test', content: 'Your tests run where they always run.' },
                { title: 'Report', content: 'The runner uploads the results and the catalog.' },
                { title: 'Judge', content: `${PRODUCT_NAME} compares them with the catalog and the schedule.` },
                { title: 'Show', content: 'Your team sees the result per environment.' },
              ]}
            />
          </Card>
        </div>

        {/* Connect */}
        <div id="connect" style={{ background: token.colorBgLayout, borderBlock: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`, scrollMarginTop: token.controlHeightLG * 1.6 }}>
          <div style={section}>
            <SectionTitle
              eyebrow="Connect"
              title="Connect a project in four steps"
              text="No SDK and no change to how your tests run. You keep a catalog next to your tests and add two client calls around your test command."
            />
            <Flex vertical gap="large">
              <ConnectStep
                n={1}
                icon={<KeyOutlined />}
                title="Create a check and keep its token"
                text={
                  <>
                    One check per environment, for example Staging. An {PRODUCT_NAME} administrator creates it; use{' '}
                    <Typography.Text code>--period none</Typography.Text> for a check that only runs on demand. The ping
                    token is printed once: store it as the CI secret <Typography.Text code>ASSERTCHECKS_PING_TOKEN</Typography.Text>.
                  </>
                }
              >
                <CodeBlock label="Administrator" code={CHECK_COMMAND} />
              </ConnectStep>
              <ConnectStep
                n={2}
                icon={<FileDoneOutlined />}
                title="Write the catalog and name your tests by it"
                text={
                  <>
                    The catalog says what must hold. <Typography.Text code>active</Typography.Text> cases are required;{' '}
                    <Typography.Text code>draft</Typography.Text> cases are listed but not run.{' '}
                    <Typography.Text code>nightly</Typography.Text> cases belong to every full run;{' '}
                    <Typography.Text code>manual</Typography.Text> cases run only when named. Put the case ID at the start
                    of each test title and each Then ID at the start of a step. The dry run under Report format checks
                    the catalog without recording anything.
                  </>
                }
              >
                <Row gutter={[token.margin, token.margin]}>
                  <Col xs={24} lg={12} style={{ minWidth: 0 }}><CodeBlock label="e2e.json" code={CATALOG} /></Col>
                  <Col xs={24} lg={12} style={{ minWidth: 0 }}><CodeBlock label="tests/E2E-001.spec.ts" code={TEST} /></Col>
                </Row>
              </ConnectStep>
              <ConnectStep
                n={3}
                icon={<CloudServerOutlined />}
                title="Report from CI"
                text={
                  <>
                    Download the client on every run so it always matches the server. Pass each tested component&apos;s
                    version URL (JSON with a 40-character <Typography.Text code>sha</Typography.Text>) to both calls. In
                    GitHub Actions the client records the run link and whether the run was scheduled.
                  </>
                }
              >
                <CodeBlock label="CI step" code={REPORT} />
              </ConnectStep>
              <ConnectStep
                n={4}
                icon={<ArrowRightOutlined />}
                title="Open your project"
                text="Each environment card shows the last run, its counts and when the next run is due. Open an environment and it starts on the failed cases."
              >
                {primary}
              </ConnectStep>
            </Flex>
          </div>
        </div>

        {/* Report format */}
        <div id="format" style={{ ...section, scrollMarginTop: token.controlHeightLG * 1.6 }}>
          <SectionTitle
            eyebrow="Report format"
            title="One fixed format, checked on arrival"
            text="All calls go to /api/ping/<token>/… and the client makes them for you; a producer that is not a test runner can send the same JSON directly. A report that does not match is recorded as Incomplete, with every wrong field named."
          />
          <Flex gap="small" wrap style={{ marginTop: -token.marginLG, marginBottom: token.marginXL }}>
            <Button icon={<FileTextOutlined />} href="/schemas/catalog.schema.json" target="_blank">Catalog format</Button>
            <Button icon={<FileTextOutlined />} href="/schemas/result.schema.json" target="_blank">Result format</Button>
          </Flex>
          <Row gutter={[token.marginLG, token.marginLG]}>
            <Col xs={24} sm={12} lg={6}>
              <FormatCard method="start" title="A run began" text="The trigger, the named cases of a partial run, and each tested component's deployed SHA. Returns the run ID." />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <FormatCard method="report" title="Here are the results" text="The catalog plus a result: Playwright's JSON report uploaded unchanged, or the cases format below." />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <FormatCard method="report" title="There are no results" text="Say why instead. The run is recorded as Incomplete, so a crash never looks like a pass." />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <FormatCard method="check" title="Would this pass?" text="A dry run: validates the catalog and result, shows the outcome the check would give, and records nothing." />
            </Col>
          </Row>
          <Row gutter={[token.marginLG, token.marginLG]} style={{ marginTop: token.marginLG }}>
            <Col xs={24} lg={12} style={{ minWidth: 0 }}>
              <Flex vertical gap="middle">
                <CodeBlock label="result · cases format" code={CASES_FORMAT} />
              </Flex>
            </Col>
            <Col xs={24} lg={12} style={{ minWidth: 0 }}>
              <Flex vertical gap="middle">
                <CodeBlock label="Partial run of named cases" code={PARTIAL} />
                <CodeBlock label="No results" code={ERROR} />
                <CodeBlock label="Dry run" code={DRY_RUN} />
                <Alert
                  type="info"
                  showIcon
                  title="IDs must match the catalog"
                  description="A run passes only when every expected case reported, nothing was skipped or flaky, every Then passed, and each version was recorded and unchanged. Reports over 5 MB or containing credential-like text are rejected."
                />
              </Flex>
            </Col>
          </Row>
        </div>

        {/* Not in scope */}
        <div style={{ background: token.colorBgLayout, borderTop: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}` }}>
          <div style={section}>
            <SectionTitle eyebrow="Boundaries" title="What it does not do" />
            <Row gutter={[token.marginLG, token.marginLG]}>
              {[
                { icon: <ApiOutlined />, title: 'Run your tests', text: 'Projects run their own suites. It never pulls code or starts a runner.' },
                { icon: <KeyOutlined />, title: 'Hold your credentials', text: 'Only results arrive. Product accounts and secrets stay with the project.' },
                { icon: <HistoryOutlined />, title: 'Show history yet', text: 'Each check shows its latest run. Every run is kept for later.' },
                { icon: <BellOutlined />, title: 'Send alerts yet', text: 'Results are on the page; notifications come later.' },
              ].map((item) => (
                <Col key={item.title} xs={24} sm={12} lg={6}>
                  <Card size="small" style={{ height: '100%' }}>
                    <Flex vertical gap="small">
                      <Typography.Text type="secondary" style={{ fontSize: token.fontSizeHeading4 }}>{item.icon}</Typography.Text>
                      <Typography.Text strong>{item.title}</Typography.Text>
                      <Typography.Text type="secondary">{item.text}</Typography.Text>
                    </Flex>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </div>
      </main>

      <footer style={{ borderTop: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}` }}>
        <Flex justify="space-between" align="center" gap="middle" wrap style={{ ...container, paddingBlock: token.paddingLG }}>
          <Typography.Text strong><Brand /></Typography.Text>
          <Typography.Text type="secondary">
            Client: <Typography.Link href="/client/assertchecks.mjs">/client/assertchecks.mjs</Typography.Link>
          </Typography.Text>
        </Flex>
      </footer>
    </div>
  )
}

function ExampleCard() {
  const { token } = theme.useToken()
  return (
    <div style={{ position: 'relative' }}>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: token.marginXL,
          background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.purple6})`,
          filter: 'blur(48px)',
          opacity: 0.25,
          borderRadius: token.borderRadiusLG,
        }}
      />
      <Card
        title={
          <Flex align="center" gap="small" wrap>
            <span>Staging</span>
            <CheckStatusTag status={EXAMPLE.status} />
          </Flex>
        }
        extra={<Tag variant="filled">Example</Tag>}
        style={{ position: 'relative', boxShadow: token.boxShadowSecondary }}
      >
        <CheckSummary check={EXAMPLE} compact />
        <Flex vertical gap="small" style={{ marginTop: token.margin }}>
          <Typography.Text type="secondary">Failed cases</Typography.Text>
          {EXAMPLE_FAILURES.map((item) => (
            <Flex key={item.id} justify="space-between" align="center" gap="small" wrap>
              <Typography.Text>
                <Typography.Text code>{item.id}</Typography.Text> {item.title}
              </Typography.Text>
              <ThenTag id={item.then} status="failed" />
            </Flex>
          ))}
        </Flex>
      </Card>
    </div>
  )
}

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  const { token } = theme.useToken()
  return (
    <Flex vertical gap="small" style={{ marginBottom: token.marginXL, maxWidth: 720 }}>
      <Typography.Text strong style={{ color: token.colorPrimary, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: token.fontSizeSM }}>
        {eyebrow}
      </Typography.Text>
      <Typography.Title level={2} style={{ margin: 0, letterSpacing: '-0.015em' }}>{title}</Typography.Title>
      {text && <Typography.Paragraph type="secondary" style={{ margin: 0, fontSize: token.fontSizeLG }}>{text}</Typography.Paragraph>}
    </Flex>
  )
}

function Pillar({ icon, color, bg, title, text }: { icon: ReactNode; color: string; bg: string; title: string; text: string }) {
  const { token } = theme.useToken()
  return (
    <Card style={{ height: '100%' }} styles={{ body: { padding: token.paddingLG } }}>
      <Flex vertical gap="middle">
        <Flex
          align="center"
          justify="center"
          style={{ width: token.controlHeightLG * 1.2, height: token.controlHeightLG * 1.2, borderRadius: token.borderRadiusLG, background: bg, color, fontSize: token.fontSizeHeading3 }}
        >
          {icon}
        </Flex>
        <Typography.Title level={4} style={{ margin: 0 }}>{title}</Typography.Title>
        <Typography.Text type="secondary">{text}</Typography.Text>
      </Flex>
    </Card>
  )
}

function ConnectStep({ n, icon, title, text, children }: { n: number; icon: ReactNode; title: string; text: ReactNode; children: ReactNode }) {
  const { token } = theme.useToken()
  return (
    <Card styles={{ body: { padding: token.paddingLG } }}>
      <Row gutter={[token.marginLG, token.margin]}>
        <Col xs={24} lg={8}>
          <Flex vertical gap="small">
            <Flex align="center" gap="small">
              <Flex
                align="center"
                justify="center"
                style={{ width: token.controlHeight, height: token.controlHeight, borderRadius: '50%', background: token.colorPrimary, color: token.colorTextLightSolid, fontWeight: token.fontWeightStrong, flex: 'none' }}
              >
                {n}
              </Flex>
              <Typography.Text type="secondary" style={{ fontSize: token.fontSizeLG }}>{icon}</Typography.Text>
            </Flex>
            <Typography.Title level={4} style={{ margin: 0 }}>{title}</Typography.Title>
            <Typography.Paragraph type="secondary" style={{ margin: 0 }}>{text}</Typography.Paragraph>
          </Flex>
        </Col>
        <Col xs={24} lg={16} style={{ minWidth: 0 }}>
          {children}
        </Col>
      </Row>
    </Card>
  )
}

function FormatCard({ method, title, text }: { method: string; title: string; text: string }) {
  const { token } = theme.useToken()
  return (
    <Card style={{ height: '100%' }}>
      <Flex vertical gap="small">
        <Typography.Text code title={`POST /api/ping/<token>/${method}`} style={{ alignSelf: 'start' }}>POST …/{method}</Typography.Text>
        <Typography.Title level={5} style={{ margin: 0, marginTop: token.marginXXS }}>{title}</Typography.Title>
        <Typography.Text type="secondary">{text}</Typography.Text>
      </Flex>
    </Card>
  )
}
