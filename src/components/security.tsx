import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Button, Card, Flex, Modal, Tag, Typography, theme } from 'antd'
import { ExportOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { SecuritySeverityTag, utc } from './status'
import type { SecurityCard as SecurityCardData, SecurityReport } from '../lib/types'
import { countsLine, reportFileName, reportMarkdown } from '../lib/security-report'
import { SECURITY_TOOLS } from '../lib/security-tools'
import { ASSERTCHECKS_STYLE, space, text } from '../infui/tokens'

// The toolset popup (ASSERT-66): what we use to security-test each release. Shown beside the Security
// page title as a button so it is easy to find.
export function SecurityToolset() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button icon={<SafetyCertificateOutlined />} onClick={() => setOpen(true)}>Security toolset</Button>
      <Modal title="Security testing toolset" open={open} footer={null} onCancel={() => setOpen(false)}>
        <Flex vertical gap={space.group}>
          <Typography.Text style={text.body}>
            The open-source checks used to security-test each release — across dependencies, code, secrets
            and the running app.
          </Typography.Text>
          {SECURITY_TOOLS.map((tool) => (
            <Flex key={tool.name} vertical gap={space.inline}>
              <Flex align="center" gap={space.stack} wrap>
                <Typography.Link href={tool.url} target="_blank" rel="noreferrer" style={text.label}>
                  {tool.name} <ExportOutlined />
                </Typography.Link>
                <Typography.Text style={text.caption}>v{tool.version}</Typography.Text>
                <Tag>{tool.category}</Tag>
              </Flex>
              <Typography.Text style={text.body}>{tool.checks}</Typography.Text>
            </Flex>
          ))}
        </Flex>
      </Modal>
    </>
  )
}

// Download one report as a Markdown file, generated from its structured data (one source of truth).
export function downloadReport(project: { name: string; slug: string }, report: SecurityReport): void {
  const blob = new Blob([reportMarkdown(project, report)], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = reportFileName(project.slug, report.version)
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

// The overview's security card (ASSERT-66): the project's latest security test report in brief, in the
// same card shape as the check cards. The whole card opens the Security page.
export function SecurityCard({ project, security }: { project: string; security: SecurityCardData }) {
  const { token } = theme.useToken()
  const navigate = useNavigate()
  const { latest, count } = security
  const open = latest.counts.critical + latest.counts.high + latest.counts.medium + latest.counts.low
  const headlineColor = latest.severity === 'critical' || latest.severity === 'high'
    ? token.colorError
    : latest.severity === 'medium'
      ? token.colorWarning
      : latest.severity === 'low'
        ? token.colorText
        : token.colorSuccess
  return (
    <Card
      hoverable
      onClick={() => navigate({ to: '/p/$project/security', params: { project } })}
      style={{ height: '100%', cursor: 'pointer' }}
      styles={{ body: { paddingTop: space.inline } }}
      title={<Link to="/p/$project/security" params={{ project }}>security-live</Link>}
      extra={<SecuritySeverityTag severity={latest.severity} />}
    >
      <Flex vertical gap={space.group}>
        <Flex align="baseline" gap={space.stack} wrap>
          <span style={{ ...text.heading1, lineHeight: ASSERTCHECKS_STYLE.lineHeightSingle, color: open > 0 ? headlineColor : token.colorSuccess }}>
            {open}
          </span>
          <Typography.Text style={text.lead}>{open === 1 ? 'open finding' : 'open findings'}</Typography.Text>
          {open > 0 && (
            <Typography.Text style={{ ...text.lead, color: text.caption.color }}>
              · {countsLine(latest.counts)}
            </Typography.Text>
          )}
        </Flex>
        <Flex align="center" gap={space.stack} wrap>
          <Typography.Text style={text.caption}>Latest</Typography.Text>
          <Typography.Text style={text.code}>{latest.version.slice(0, 12)}</Typography.Text>
        </Flex>
        <Typography.Text style={text.body}>{latest.summary}</Typography.Text>
        <Flex
          align="center"
          gap={space.inline}
          style={{ paddingTop: space.group, borderTop: `${token.lineWidth}px ${token.lineType} ${token.colorSplit}` }}
        >
          <Typography.Text style={text.caption}>
            Assessed {utc(latest.assessedAt)} · {count} {count === 1 ? 'report' : 'reports'}
          </Typography.Text>
        </Flex>
      </Flex>
    </Card>
  )
}

