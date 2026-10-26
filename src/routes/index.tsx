import { createFileRoute } from '@tanstack/react-router'
import { App, Button, Card, Col, Flex, Row, Tag, Typography, theme } from 'antd'
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
import { ASSERTCHECKS_STYLE, space, text } from '../infui/tokens'
import { Brand, PRODUCT_NAME } from '../components/brand'
import { CheckSummary } from '../components/check-summary'
import { CheckStatusTag } from '../components/status'
import { HowItWorks } from '../components/how-it-works'
import { pageFrame } from '../infui/page-frame'
import { FORMAT_LINKS, agentPrompt } from '../lib/connect-guide'
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
  counts: { total: 48, passed: 41, failed: 2, notRun: 0, draft: 4, manual: 1 },
  catalogChanges: [],
}

function HomePage() {
  const { me } = Route.useLoaderData()
  const { token } = theme.useToken()

  const primary = (
    <Button type="primary" size="large" href={me ? '/p' : '/login'} icon={<ArrowRightOutlined />} iconPlacement="end">
      {me ? 'Open my projects' : 'Sign in'}
    </Button>
  )

  const container = pageFrame
  const section = { ...pageFrame, paddingBlock: space.section }

  return (
    <div style={{ minHeight: '100vh', background: token.colorBgLayout }}>
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
        <Flex align="center" gap={space.group} style={{ ...container, height: token.controlHeightLG * 1.4 }}>
          <a href="/" aria-label={`${PRODUCT_NAME} home`}><Brand /></a>
          <Flex flex={1} justify="end" align="center" gap={space.stack}>
            {/* Section links need room; the stylesheet shows them from the md breakpoint so SSR renders them too. */}
            <nav className="home-nav">
              <Button type="text" href="#checks">What it checks</Button>
              <Button type="text" href="#connect">How it works</Button>
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
              `radial-gradient(${token.colorBorderSecondary} 1px, transparent 1px) 0 0 / ${ASSERTCHECKS_STYLE.heroDotGrid}px ${ASSERTCHECKS_STYLE.heroDotGrid}px`,
              token.colorBgLayout,
            ].join(', '),
            borderBottom: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
          }}
        >
          <div style={section}>
            <Row gutter={[space.section, space.block]} align="middle">
              <Col xs={24} lg={13}>
                <Flex vertical gap={space.group} align="start">
                  <Typography.Title
                    level={1}
                    style={{
                      margin: 0,
                      ...text.display,
                    }}
                  >
                    Know every assertion still holds.
                  </Typography.Title>
                  <Typography.Paragraph style={{ ...text.lead, margin: 0, maxWidth: ASSERTCHECKS_STYLE.heroTextWidth }}>
                    Your project runs its end-to-end tests and reports every run. {PRODUCT_NAME} shows whether each one
                    arrived on time, ran in full, and which assertion failed.
                  </Typography.Paragraph>
                  <Flex gap={space.stack} wrap>
                    {primary}
                    <CopyForAgent />
                  </Flex>
                  <Flex gap={space.group} wrap>
                    {['Never runs your tests', 'Never holds your product credentials'].map((item) => (
                      <Typography.Text key={item} style={text.body}>
                        <SafetyCertificateOutlined style={{ color: token.colorSuccess, marginInlineEnd: space.inline }} />
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
        </div>

        {/* What it checks */}
        <div id="checks" style={{ ...section, scrollMarginTop: token.controlHeightLG * 1.4 }}>
          <SectionTitle eyebrow="What it checks" title="Every check answers three questions" />
          <Row gutter={[space.group, space.group]}>
            <Col xs={24} md={8}>
              <Pillar
                icon={<ClockCircleOutlined />}
                color={token.colorWarning}
                bg={token.colorWarningBg}
                title="On time?"
                description="A scheduled run that misses its grace period turns the check Late."
              />
            </Col>
            <Col xs={24} md={8}>
              <Pillar
                icon={<FileDoneOutlined />}
                color={token.colorPrimary}
                bg={token.colorPrimaryBg}
                title="Complete?"
                description="A required case that did not run, was skipped or flaky makes the run Incomplete, never Passed."
              />
            </Col>
            <Col xs={24} md={8}>
              <Pillar
                icon={<SafetyCertificateOutlined />}
                color={token.colorError}
                bg={token.colorErrorBg}
                title="Correct?"
                description="One failed Then fails the run, and the page opens on that case and its error."
              />
            </Col>
          </Row>
        </div>

        {/* How it works: a diagram of one run. Every step, command and format detail goes out through
            "Copy for your agent", built from src/lib/connect-guide.ts. */}
        <div id="connect" style={{ borderTop: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`, scrollMarginTop: token.controlHeightLG * 1.4 }}>
          <div style={section}>
            <SectionTitle
              eyebrow="How it works"
              title="How a run reaches your team"
              description="No SDK. Your runner reports when a run starts and what it found; AssertChecks judges it against your catalog and schedule."
            />
            <Card style={{ marginBottom: space.group }}>
              <HowItWorks />
            </Card>
            <Card style={{ borderColor: token.colorPrimaryBorder, background: token.colorPrimaryBg }}>
              <Flex justify="space-between" align="center" gap={space.group} wrap>
                <Flex vertical gap={space.stack} style={{ flex: '1 1 320px', minWidth: 0 }}>
                  <Typography.Title level={5} style={{ ...text.heading3, margin: 0 }}>Connect a project with your coding agent</Typography.Title>
                  <Typography.Text style={text.body}>
                    Copies every step, command and the report format as Markdown, ready to paste.
                  </Typography.Text>
                  <Flex gap={space.stack} wrap>
                    {FORMAT_LINKS.map((link) => (
                      <Button key={link.path} type="link" icon={<FileTextOutlined />} href={link.path} target="_blank" style={{ paddingInline: 0, marginInlineEnd: space.group }}>
                        {link.label}
                      </Button>
                    ))}
                  </Flex>
                </Flex>
                <CopyForAgent large />
              </Flex>
            </Card>
          </div>
        </div>
      </main>

      <footer style={{ borderTop: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}` }}>
        <Flex justify="center" align="center" wrap gap={space.stack} style={{ ...container, paddingBlock: space.block }}>
          <Typography.Text style={text.caption}>© {new Date().getUTCFullYear()} {PRODUCT_NAME}. All rights reserved.</Typography.Text>
          <Typography.Link href="/privacy">Privacy</Typography.Link>
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
          inset: space.block,
          background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.purple6})`,
          filter: 'blur(48px)',
          opacity: 0.25,
          borderRadius: token.borderRadiusLG,
        }}
      />
      <Card
        title={
          <Flex align="center" gap={space.stack} wrap>
            <span>Staging</span>
            <CheckStatusTag status={EXAMPLE.status} />
          </Flex>
        }
        extra={<Tag variant="filled">Example</Tag>}
        style={{ position: 'relative', boxShadow: token.boxShadowSecondary }}
        styles={{ body: { paddingTop: space.inline } }}
      >
        <CheckSummary check={EXAMPLE} compact />
      </Card>
    </div>
  )
}

function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  const { token } = theme.useToken()
  return (
    <Flex vertical gap={space.stack} style={{ marginBottom: space.block, maxWidth: token.screenLG }}>
      <Typography.Text style={text.eyebrow}>
        {eyebrow}
      </Typography.Text>
      <Typography.Title level={2} style={{ ...text.heading1, margin: 0 }}>{title}</Typography.Title>
      {description && <Typography.Paragraph style={{ ...text.body, margin: 0 }}>{description}</Typography.Paragraph>}
    </Flex>
  )
}

function Pillar({ icon, color, bg, title, description }: { icon: ReactNode; color: string; bg: string; title: string; description: string }) {
  const { token } = theme.useToken()
  return (
    <Card style={{ height: '100%' }}>
      <Flex vertical gap={space.group}>
        <Flex
          align="center"
          justify="center"
          style={{ width: token.controlHeightLG, height: token.controlHeightLG, borderRadius: token.borderRadius, background: bg, color, fontSize: text.heading2.fontSize }}
        >
          {icon}
        </Flex>
        <Typography.Title level={5} style={{ ...text.heading3, margin: 0 }}>{title}</Typography.Title>
        <Typography.Text style={text.body}>{description}</Typography.Text>
      </Flex>
    </Card>
  )
}

function CopyForAgent({ large = false }: { large?: boolean }) {
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
    >
      Copy for your agent
    </Button>
  )
}

