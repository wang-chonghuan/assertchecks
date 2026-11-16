import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Card, Descriptions, Flex, Modal, Table, Tag, Typography, theme } from 'antd'
import type { TableColumnsType } from 'antd'
import { ExportOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { SecuritySeverityTag, utc } from './status'
import type { SecurityCard as SecurityCardData, SecurityFinding, SecurityLink, SecurityReport } from '../lib/types'
import { countsLine, reportFileName, reportMarkdown, securityCounts } from '../lib/security-report'
import { SECURITY_TOOLS } from '../lib/security-tools'
import { ASSERTCHECKS_STYLE, space, text } from '../infui/tokens'

// The toolset popup on the security-live card (ASSERT-66): what we use to security-test each release.
// A link because the card itself navigates; clicking it opens the dialog instead of the Security page.
function SecurityToolset() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Typography.Link onClick={(event) => { event.stopPropagation(); setOpen(true) }} style={text.caption}>
        <SafetyCertificateOutlined /> Security toolset
      </Typography.Link>
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
          justify="space-between"
          gap={space.stack}
          wrap
          style={{ paddingTop: space.group, borderTop: `${token.lineWidth}px ${token.lineType} ${token.colorSplit}` }}
        >
          <Typography.Text style={text.caption}>
            Assessed {utc(latest.assessedAt)} · {count} {count === 1 ? 'report' : 'reports'}
          </Typography.Text>
          <SecurityToolset />
        </Flex>
      </Flex>
    </Card>
  )
}

function LinkList({ items }: { items: SecurityLink[] }) {
  return (
    <Flex vertical gap={space.stack}>
      {items.map((item) => (
        <Typography.Link key={`${item.label}-${item.url}`} href={item.url} target="_blank" rel="noreferrer">
          {item.label} <ExportOutlined />
        </Typography.Link>
      ))}
    </Flex>
  )
}

// One report in full, shown when its row on the Security page is expanded: the header, the summary, the
// findings, the release's security changes and the links.
export function SecurityReportDetail({ report }: { report: SecurityReport }) {
  const { token } = theme.useToken()
  const findingColumns: TableColumnsType<SecurityFinding> = [
    { title: 'ID', dataIndex: 'id', render: (id: string) => <Typography.Text style={text.label}>{id}</Typography.Text> },
    { title: 'Severity', dataIndex: 'severity', render: (_, item) => <SecuritySeverityTag severity={item.severity} /> },
    { title: 'Area', dataIndex: 'area', render: (area: string) => <Typography.Text style={text.body}>{area}</Typography.Text> },
    { title: 'Status', dataIndex: 'status', render: (status: string) => <Typography.Text style={text.caption}>{status}</Typography.Text> },
    {
      title: 'Detail',
      key: 'detail',
      render: (_, item) => (
        <Flex vertical gap={space.inline}>
          <Typography.Text style={text.body}>{item.note}</Typography.Text>
          {item.ref && (
            <Typography.Link href={item.ref.url} target="_blank" rel="noreferrer" style={text.caption}>
              {item.ref.label} <ExportOutlined />
            </Typography.Link>
          )}
        </Flex>
      ),
    },
  ]
  return (
    <Flex vertical gap={space.block} style={{ paddingBlock: space.stack }}>
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
        <Typography.Text style={text.label}>Findings</Typography.Text>
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          scroll={{ x: token.controlHeight * 18 }}
          columns={findingColumns}
          dataSource={report.findings}
          locale={{ emptyText: 'No open findings in scope.' }}
        />
      </Flex>
      {report.changes.length > 0 && (
        <Flex vertical gap={space.stack}>
          <Typography.Text style={text.label}>Release security changes</Typography.Text>
          <LinkList items={report.changes} />
        </Flex>
      )}
      {report.links.length > 0 && (
        <Flex vertical gap={space.stack}>
          <Typography.Text style={text.label}>Links</Typography.Text>
          <LinkList items={report.links} />
        </Flex>
      )}
    </Flex>
  )
}
