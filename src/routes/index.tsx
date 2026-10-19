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
import { ASSERTCHECKS_STYLE } from '../theme'
import { Brand, PRODUCT_NAME } from '../components/brand'
import { CheckSummary } from '../components/check-summary'
import { CheckStatusTag } from '../components/status'
import { HowItWorks } from '../components/how-it-works'
import { pageFrame } from '../components/page-frame'
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
  counts: { total: 48, passed: 41, failed: 2, draft: 4, manual: 1 },
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
  const section = { ...pageFrame, paddingBlock: token.paddingXL }

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
        <Flex align="center" gap="middle" style={{ ...container, height: token.controlHeightLG * 1.4 }}>
          <a href="/" aria-label={`${PRODUCT_NAME} home`}><Brand /></a>
          <Flex flex={1} justify="end" align="center" gap="small">
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
              `radial-gradient(${token.colorBorderSecondary} 1px, transparent 1px) 0 0 / ${token.sizeLG}px ${token.sizeLG}px`,
              token.colorBgLayout,
            ].join(', '),
            borderBottom: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
          }}
        >
          <div style={section}>
            <Row gutter={[token.marginXL, token.marginLG]} align="middle">
              <Col xs={24} lg={13}>
                <Flex vertical gap="middle" align="start">
                  <Typography.Title
                    level={1}
                    style={{
                      margin: 0,
                      fontSize: `clamp(${token.fontSizeHeading2}px, 5.3vw, ${token.fontSizeHeading1}px)`,
                      fontWeight: ASSERTCHECKS_STYLE.fontWeightDisplay,
                      lineHeight: 1.05,
                    }}
                  >
                    Know every assertion still holds.
                  </Typography.Title>
                  <Typography.Paragraph style={{ margin: 0, fontSize: token.fontSizeLG, color: token.colorTextSecondary, maxWidth: 560 }}>
                    Your project runs its end-to-end tests and reports every run. {PRODUCT_NAME} shows whether each one
                    arrived on time, ran in full, and which assertion failed.
                  </Typography.Paragraph>
                  <Flex gap="small" wrap>
                    {primary}
                    <CopyForAgent />
                  </Flex>
                  <Flex gap="middle" wrap>
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
        </div>

        {/* What it checks */}
        <div id="checks" style={{ ...section, scrollMarginTop: token.controlHeightLG * 1.4 }}>
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

        {/* How it works: a diagram of one run. Every step, command and format detail goes out through
            "Copy for your agent", built from src/lib/connect-guide.ts. */}
        <div id="connect" style={{ borderTop: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`, scrollMarginTop: token.controlHeightLG * 1.4 }}>
          <div style={section}>
            <SectionTitle
              eyebrow="How it works"
              title="One run, from your CI to your team"
              text="No SDK. Your runner reports when a run starts and what it found; AssertChecks judges it against your catalog and schedule."
            />
            <Card style={{ marginBottom: token.margin }}>
              <HowItWorks />
            </Card>
            <Card style={{ borderColor: token.colorPrimaryBorder, background: token.colorPrimaryBg }}>
              <Flex justify="space-between" align="center" gap="middle" wrap>
                <Flex vertical gap="small" style={{ flex: '1 1 320px', minWidth: 0 }}>
                  <Typography.Title level={5} style={{ margin: 0 }}>Connect a project with your coding agent</Typography.Title>
                  <Typography.Text type="secondary">
                    Copies every step, command and the report format as Markdown, ready to paste.
                  </Typography.Text>
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
          </div>
        </div>
      </main>

      <footer style={{ borderTop: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}` }}>
        <Flex justify="center" align="center" style={{ ...container, paddingBlock: token.padding }}>
          <Typography.Text type="secondary">© {new Date().getUTCFullYear()} {PRODUCT_NAME}. All rights reserved.</Typography.Text>
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
        styles={{ body: { paddingTop: token.paddingXXS } }}
      >
        <CheckSummary check={EXAMPLE} compact />
      </Card>
    </div>
  )
}

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  const { token } = theme.useToken()
  return (
    <Flex vertical gap={token.marginXXS} style={{ marginBottom: token.marginLG, maxWidth: token.screenLG }}>
      <Typography.Text strong style={{ color: token.colorPrimary, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: token.fontSizeSM }}>
        {eyebrow}
      </Typography.Text>
      <Typography.Title level={2} style={{ margin: 0 }}>{title}</Typography.Title>
      {text && <Typography.Paragraph type="secondary" style={{ margin: 0 }}>{text}</Typography.Paragraph>}
    </Flex>
  )
}

function Pillar({ icon, color, bg, title, text }: { icon: ReactNode; color: string; bg: string; title: string; text: string }) {
  const { token } = theme.useToken()
  return (
    <Card style={{ height: '100%' }}>
      <Flex vertical gap="middle">
        <Flex
          align="center"
          justify="center"
          style={{ width: token.controlHeightLG, height: token.controlHeightLG, borderRadius: token.borderRadius, background: bg, color, fontSize: token.fontSizeHeading4 }}
        >
          {icon}
        </Flex>
        <Typography.Title level={5} style={{ margin: 0 }}>{title}</Typography.Title>
        <Typography.Text type="secondary">{text}</Typography.Text>
      </Flex>
    </Card>
  )
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
      style={large ? { fontWeight: token.fontWeightStrong } : undefined}
    >
      Copy for your agent
    </Button>
  )
}

