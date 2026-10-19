import { createFileRoute } from '@tanstack/react-router'
import { Alert, App, Button, Card, Col, Collapse, Flex, Row, Tag, Typography, theme } from 'antd'
import {
  ArrowRightOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import type { ReactNode } from 'react'
import { getMe } from '../server/fns'
import { Brand, PRODUCT_NAME } from '../components/brand'
import { CheckSummary } from '../components/check-summary'
import { CheckStatusTag, ThenTag } from '../components/status'
import { CodeBlock } from '../components/code-block'
import { CASES_FORMAT, CONNECT_STEPS, FORMAT_CALLS, FORMAT_INTRO, FORMAT_LINKS, FORMAT_SAMPLES, PASS_RULE, agentPrompt } from '../lib/connect-guide'
import type { CheckCard } from '../lib/types'

export const Route = createFileRoute('/')({
  loader: async () => ({ me: await getMe() }),
  head: () => ({ meta: [{ title: `${PRODUCT_NAME} · End-to-end assertion monitoring` }] }),
  component: HomePage,
})

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
          <a href="/" aria-label={`${PRODUCT_NAME} home`}><Brand /></a>
          <Flex flex={1} justify="end" align="center" gap="small">
            {/* Section links need room; the stylesheet shows them from the md breakpoint so SSR renders them too. */}
            <nav className="home-nav">
              <Button type="text" href="#checks">What it checks</Button>
              <Button type="text" href="#connect">Connect</Button>
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
                <Typography.Title
                  level={1}
                  style={{
                    margin: 0,
                    fontSize: `clamp(${token.fontSizeHeading2}px, 5.4vw, ${Number(token.fontSizeHeading1) * 1.55}px)`,
                    lineHeight: 1.08,
                    letterSpacing: '-0.025em',
                  }}
                >
                  Know every assertion still holds.
                </Typography.Title>
                <Typography.Paragraph style={{ margin: 0, fontSize: token.fontSizeHeading5, color: token.colorTextSecondary, maxWidth: 560 }}>
                  Your project runs its end-to-end tests and reports every run. {PRODUCT_NAME} shows whether each one
                  arrived on time, ran in full, and which assertion failed.
                </Typography.Paragraph>
                <Flex gap="small" wrap>
                  {primary}
                  <CopyForAgent />
                </Flex>
                <Flex gap="large" wrap>
                  {['Never runs your tests', 'Never holds your product credentials'].map((item) => (
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
          <SectionTitle eyebrow="What it checks" title="Every check answers three questions" />
          <Row gutter={[token.marginLG, token.marginLG]}>
            <Col xs={24} md={8}>
              <Pillar
                icon={<ClockCircleOutlined />}
                color={token.colorWarning}
                bg={token.colorWarningBg}
                title="On time?"
                text="A scheduled run that misses its grace period turns the check Late."
              />
            </Col>
            <Col xs={24} md={8}>
              <Pillar
                icon={<FileDoneOutlined />}
                color={token.colorPrimary}
                bg={token.colorPrimaryBg}
                title="Complete?"
                text="A required case that did not run, was skipped or flaky makes the run Incomplete, never Passed."
              />
            </Col>
            <Col xs={24} md={8}>
              <Pillar
                icon={<SafetyCertificateOutlined />}
                color={token.colorError}
                bg={token.colorErrorBg}
                title="Correct?"
                text="One failed Then fails the run, and the page opens on that case and its error."
              />
            </Col>
          </Row>
        </div>

        {/* Connect: every instruction lives here, and the copy button hands the same content to an agent. */}
        <div id="connect" style={{ background: token.colorBgLayout, borderBlock: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`, scrollMarginTop: token.controlHeightLG * 1.6 }}>
          <div style={section}>
            <SectionTitle
              eyebrow="Connect"
              title="Connect a project"
              text="No SDK. Keep a catalog next to your tests and add two client calls around your test command."
            />
            <Card
              style={{ marginTop: -token.marginSM, marginBottom: token.marginLG, borderColor: token.colorPrimaryBorder, background: token.colorPrimaryBg }}
              styles={{ body: { padding: token.paddingLG } }}
            >
              <Flex justify="space-between" align="center" gap="large" wrap>
                <Flex vertical gap="small" style={{ flex: '1 1 320px', minWidth: 0 }}>
                  <Typography.Title level={4} style={{ margin: 0 }}>Let your coding agent connect it</Typography.Title>
                  <Typography.Text type="secondary">Copies every step below as Markdown, ready to paste.</Typography.Text>
                  <Flex gap="small" wrap>
                    {FORMAT_LINKS.map((link) => (
                      <Button key={link.path} type="link" icon={<FileTextOutlined />} href={link.path} target="_blank" style={{ paddingInline: 0, marginInlineEnd: token.margin }}>
                        {link.label}
                      </Button>
                    ))}
                  </Flex>
                </Flex>
                <CopyForAgent large />
              </Flex>
            </Card>
            <Flex vertical gap="large">
              {CONNECT_STEPS.map((step, index) => (
                <ConnectStep key={step.title} n={index + 1} title={step.title} text={<Inline text={step.text} />}>
                  {step.samples.length > 0 ? (
                    <Row gutter={[token.margin, token.margin]}>
                      {step.samples.map((sample) => (
                        <Col key={sample.label} xs={24} lg={step.samples.length === 2 ? 12 : 24} style={{ minWidth: 0 }}>
                          <CodeBlock label={sample.label} code={sample.code} />
                        </Col>
                      ))}
                    </Row>
                  ) : primary}
                </ConnectStep>
              ))}
              <Collapse
                items={[{
                  key: 'format',
                  label: <Typography.Text strong>Report format reference</Typography.Text>,
                  children: (
                    <Flex vertical gap="large">
                      <Typography.Paragraph type="secondary" style={{ margin: 0 }}><Inline text={FORMAT_INTRO} /></Typography.Paragraph>
                      <Row gutter={[token.margin, token.margin]}>
                        {FORMAT_CALLS.map((call) => (
                          <Col key={call.title} xs={24} sm={12} lg={6}>
                            <FormatCard method={call.method} title={call.title} text={call.text} />
                          </Col>
                        ))}
                      </Row>
                      <Row gutter={[token.margin, token.margin]}>
                        <Col xs={24} lg={12} style={{ minWidth: 0 }}>
                          <CodeBlock label={CASES_FORMAT.label} code={CASES_FORMAT.code} />
                        </Col>
                        <Col xs={24} lg={12} style={{ minWidth: 0 }}>
                          <Flex vertical gap="middle">
                            {FORMAT_SAMPLES.map((sample) => <CodeBlock key={sample.label} label={sample.label} code={sample.code} />)}
                            <Alert type="info" showIcon title="IDs must match the catalog" description={PASS_RULE.replace('IDs must match the catalog. ', '')} />
                          </Flex>
                        </Col>
                      </Row>
                    </Flex>
                  ),
                }]}
              />
            </Flex>
          </div>
        </div>

      </main>

      <footer style={{ borderTop: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}` }}>
        <Flex justify="space-between" align="center" gap="middle" wrap style={{ ...container, paddingBlock: token.paddingLG }}>
          <Brand />
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

function ConnectStep({ n, title, text, children }: { n: number; title: string; text: ReactNode; children: ReactNode }) {
  const { token } = theme.useToken()
  return (
    <Card styles={{ body: { padding: token.paddingLG } }}>
      <Row gutter={[token.marginLG, token.margin]}>
        <Col xs={24} lg={8}>
          <Flex vertical gap="small">
            <Flex
              align="center"
              justify="center"
              style={{ width: token.controlHeight, height: token.controlHeight, borderRadius: '50%', background: token.colorPrimary, color: token.colorTextLightSolid, fontWeight: token.fontWeightStrong, flex: 'none' }}
            >
              {n}
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

// Renders `backticks` in guide text as inline code.
function Inline({ text }: { text: string }) {
  return <>{text.split('`').map((part, index) => (index % 2 ? <Typography.Text key={index} code>{part}</Typography.Text> : part))}</>
}

function CopyForAgent({ large = false }: { large?: boolean }) {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(agentPrompt())
      message.success('Copied. Paste it to your coding agent.')
    } catch {
      message.error('Copying failed. Select the steps below instead.')
    }
  }
  return (
    <Button
      type={large ? 'primary' : 'default'}
      size="large"
      icon={<CopyOutlined />}
      onClick={copy}
      style={large ? { height: 'auto', paddingBlock: token.padding, paddingInline: token.paddingXL, fontSize: token.fontSizeHeading4, fontWeight: token.fontWeightStrong, boxShadow: token.boxShadowSecondary } : undefined}
    >
      Copy for your agent
    </Button>
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
