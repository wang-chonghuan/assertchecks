import { Link, createFileRoute } from '@tanstack/react-router'
import { Button, Card, Empty, Flex, Table, Tag, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import { SecuritySeverityTag, utc } from '../../../../../components/status'
import { SecurityToolset, downloadReport } from '../../../../../components/security'
import { getSecurityReports } from '../../../../../server/fns'
import type { SecurityReport } from '../../../../../lib/types'
import { countsLine, securityCounts } from '../../../../../lib/security-report'
import { PRODUCT_NAME } from '../../../../../components/brand'
import { space, text } from '../../../../../infui/tokens'

export const Route = createFileRoute('/_app/p/$project/security/')({
  loader: ({ params }) => getSecurityReports({ data: { project: params.project } }),
  head: ({ loaderData }) => ({ meta: [{ title: `Security · ${loaderData?.project.name ?? 'Project'} · ${PRODUCT_NAME}` }] }),
  component: SecurityPage,
})

function SecurityPage() {
  const { project, reports } = Route.useLoaderData()

  const columns: TableColumnsType<SecurityReport> = [
    {
      title: 'Version',
      dataIndex: 'version',
      render: (version: string, report) => (
        <Flex align="center" gap={space.stack} wrap>
          {report.versionUrl
            ? <Typography.Link href={report.versionUrl} target="_blank" rel="noreferrer" style={text.code}>{version.slice(0, 12)}</Typography.Link>
            : <Typography.Text style={text.code}>{version.slice(0, 12)}</Typography.Text>}
          <Tag>{report.environment}</Tag>
        </Flex>
      ),
    },
    { title: 'Assessed', dataIndex: 'assessedAt', render: (at: string) => <Typography.Text style={text.body}>{utc(at)}</Typography.Text> },
    {
      title: 'Result',
      key: 'result',
      render: (_, report) => (
        <Flex align="center" gap={space.stack} wrap>
          <SecuritySeverityTag severity={report.severity} />
          <Typography.Text style={text.caption}>{countsLine(securityCounts(report.findings))}</Typography.Text>
        </Flex>
      ),
    },
    {
      title: '',
      key: 'download',
      align: 'right',
      render: (_, report) => (
        <Button size="small" icon={<DownloadOutlined />} onClick={() => downloadReport(project, report)}>.md</Button>
      ),
    },
  ]

  return (
    <Flex vertical gap={space.group}>
      <Flex align="center" justify="space-between" gap={space.stack} wrap>
        <Typography.Title level={2} style={{ ...text.heading2, margin: 0 }}>
          <Link to="/p/$project" params={{ project: project.slug }}>{project.name}</Link> / Security
        </Typography.Title>
        <SecurityToolset />
      </Flex>
      <Typography.Text style={text.body}>
        One security test report per assessed release, newest first. Download any report as Markdown for
        its full findings and links.
      </Typography.Text>
      <Card>
        <Table
          rowKey="version"
          size="small"
          scroll={{ x: 'max-content' }}
          pagination={reports.length > 10 ? { pageSize: 10, size: 'small' } : false}
          columns={columns}
          dataSource={reports}
          locale={{ emptyText: <Empty description="No security test reports yet." /> }}
        />
      </Card>
    </Flex>
  )
}
