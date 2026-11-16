import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Button, Card, Descriptions, Flex, Modal, Table, Tag, Typography, theme } from 'antd'
import type { TableColumnsType } from 'antd'
import { ExportOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { SecuritySeverityTag, utc } from './status'
import type { SecurityCard as SecurityCardData, SecurityFinding, SecurityReport } from '../lib/types'
import { countsLine, groupByScanner, groupResult, reportFileName, reportMarkdown, securityCounts } from '../lib/security-report'
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

function Finding({ finding }: { finding: SecurityFinding }) {
  return (
    <Flex vertical gap={space.inline}>
      <Flex align="center" gap={space.stack} wrap>
        <Typography.Text style={text.label}>{finding.id}</Typography.Text>
        <SecuritySeverityTag severity={finding.severity} />
        <Typography.Text style={text.body}>{finding.area}</Typography.Text>
        <Typography.Text style={text.caption}>· {finding.status}</Typography.Text>
      </Flex>
      <Typography.Text style={text.body}>{finding.note}</Typography.Text>
      {finding.ref && (
        <Typography.Link href={finding.ref.url} target="_blank" rel="noreferrer" style={text.caption}>
          {finding.ref.label} <ExportOutlined />
        </Typography.Link>
      )}
    </Flex>
  )
}

interface ToolRow { key: string; name: string; version: string; coverage: string; result: string }

// One report in full for its own page (ASSERT-68): the metadata, a per-scanner tools table and the
// findings grouped by scanner — the same content as the Markdown download, rendered natively.
export function SecurityReportBody({ report }: { report: SecurityReport }) {
  const groups = groupByScanner(report.findings)
  const toolRows: ToolRow[] = groups.map(({ tool, findings }) => ({
    key: tool.name, name: tool.name, version: tool.version, coverage: tool.category, result: groupResult(findings),
  }))
  const toolColumns: TableColumnsType<ToolRow> = [
    { title: 'Scanner', dataIndex: 'name', render: (name: string) => <Typography.Text style={text.label}>{name}</Typography.Text> },
    { title: 'Version', dataIndex: 'version', render: (v: string) => <Typography.Text style={text.code}>{v}</Typography.Text> },
    { title: 'Coverage', dataIndex: 'coverage', render: (c: string) => <Typography.Text style={text.body}>{c}</Typography.Text> },
    { title: 'Result', dataIndex: 'result', render: (r: string) => <Typography.Text style={r === 'No findings' ? text.caption : text.body}>{r}</Typography.Text> },
  ]
  return (
    <Flex vertical gap={space.block}>
      <Descriptions
        size="small"
        column={1}
        items={[
          {
            key: 'version',
            label: 'Version',
            children: report.versionUrl
              ? <Typography.Link href={report.versionUrl} target="_blank" rel="noreferrer" style={text.code}>{report.version} <ExportOutlined /></Typography.Link>
              : <Typography.Text style={text.code}>{report.version}</Typography.Text>,
          },
          { key: 'env', label: 'Environment', children: <Typography.Text style={text.body}>{report.environment}</Typography.Text> },
          { key: 'assessed', label: 'Assessed', children: <Typography.Text style={text.body}>{utc(report.assessedAt)}</Typography.Text> },
          {
            key: 'result',
            label: 'Result',
            children: (
              <Flex align="center" gap={space.stack} wrap>
                <SecuritySeverityTag severity={report.severity} />
                <Typography.Text style={text.caption}>{countsLine(securityCounts(report.findings))}</Typography.Text>
              </Flex>
            ),
          },
        ]}
      />
      <Flex vertical gap={space.stack}>
        <Typography.Text style={text.label}>Summary</Typography.Text>
        <Typography.Text style={text.body}>{report.summary}</Typography.Text>
      </Flex>
      <Flex vertical gap={space.stack}>
        <Typography.Text style={text.label}>Tools</Typography.Text>
        <Table rowKey="key" size="small" pagination={false} scroll={{ x: 'max-content' }} columns={toolColumns} dataSource={toolRows} />
      </Flex>
      <Flex vertical gap={space.block}>
        <Typography.Text style={text.label}>Findings by scanner</Typography.Text>
        {groups.map(({ tool, findings }) => (
          <Flex key={tool.name} vertical gap={space.stack}>
            <Typography.Text style={text.body}>{tool.name} {tool.version} — {tool.category}</Typography.Text>
            {findings.length
              ? findings.map((f) => <Finding key={f.id} finding={f} />)
              : <Typography.Text style={text.caption}>No findings.</Typography.Text>}
          </Flex>
        ))}
      </Flex>
      {report.links.length > 0 && (
        <Flex vertical gap={space.stack}>
          <Typography.Text style={text.label}>Links</Typography.Text>
          {report.links.map((l) => (
            <Typography.Link key={`${l.label}-${l.url}`} href={l.url} target="_blank" rel="noreferrer">
              {l.label} <ExportOutlined />
            </Typography.Link>
          ))}
        </Flex>
      )}
    </Flex>
  )
}

