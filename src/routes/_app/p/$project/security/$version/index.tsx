import { Link, createFileRoute } from '@tanstack/react-router'
import { App, Button, Card, Flex, Typography } from 'antd'
import { CopyOutlined, DownloadOutlined } from '@ant-design/icons'
import { SecurityReportBody, downloadReport } from '../../../../../../components/security'
import { getSecurityReport } from '../../../../../../server/fns'
import { PRODUCT_NAME } from '../../../../../../components/brand'
import { space, text } from '../../../../../../infui/tokens'

export const Route = createFileRoute('/_app/p/$project/security/$version/')({
  loader: ({ params }) => getSecurityReport({ data: { project: params.project, version: params.version } }),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.report.version ?? 'Report'} · Security · ${loaderData?.project.name ?? 'Project'} · ${PRODUCT_NAME}` }],
  }),
  component: SecurityReportPage,
})

function SecurityReportPage() {
  const { project, report } = Route.useLoaderData()
  const { message } = App.useApp()

  const copyLink = async () => {
    const href = `${window.location.origin}/p/${encodeURIComponent(project.slug)}/security/${encodeURIComponent(report.version)}`
    try {
      await navigator.clipboard.writeText(href)
      message.success('Copied the link to this report.')
    } catch {
      message.error('Copying failed. Allow clipboard access for this page and try again.')
    }
  }

  return (
    <Flex vertical gap={space.group}>
      <Flex align="center" justify="space-between" gap={space.stack} wrap>
        <Typography.Title level={2} style={{ ...text.heading2, margin: 0 }}>
          <Link to="/p/$project" params={{ project: project.slug }}>{project.name}</Link>
          {' / '}
          <Link to="/p/$project/security" params={{ project: project.slug }}>Security</Link>
          {' / '}
          {report.version}
        </Typography.Title>
        <Flex align="center" gap={space.stack} wrap>
          <Button size="small" icon={<CopyOutlined />} onClick={copyLink}>Copy link</Button>
          {report.files.length === 0 && (
            <Button size="small" icon={<DownloadOutlined />} onClick={() => downloadReport(project, report)}>Download .md</Button>
          )}
        </Flex>
      </Flex>
      <Card>
        <SecurityReportBody project={project} report={report} />
      </Card>
    </Flex>
  )
}
