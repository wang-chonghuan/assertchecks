import { Link, createFileRoute } from '@tanstack/react-router'
import { Alert, Breadcrumb, Card, Col, Collapse, Descriptions, Empty, Flex, Row, Statistic, Table, Tabs, Typography, theme } from 'antd'
import type { TableColumnsType } from 'antd'
import { ExportOutlined } from '@ant-design/icons'
import {
  ActiveRunNotice, CaseStatusTag, CheckStatusTag, OutcomeTag, OutsideRunTag, PartialRunNotice, Sha, ThenTag, TriggerTag, scheduleText, utc,
} from '../../../../../../components/status'
import { getCheck } from '../../../../../../server/fns'
import type { CaseResult, OutsideCase, Versions } from '../../../../../../lib/types'
import { PRODUCT_NAME } from '../../../../../../components/brand'

export const Route = createFileRoute('/_app/p/$project/checks/$check/')({
  loader: ({ params }) => getCheck({ data: { project: params.project, check: params.check } }),
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.check.name ?? 'Check'} · ${PRODUCT_NAME}` }] }),
  component: CheckPage,
})

// Every tested component either snapshot names, in a stable order.
function versionNames(start: Versions | null, end: Versions | null): string[] {
  return [...new Set([...Object.keys(start ?? {}), ...Object.keys(end ?? {})])].sort()
}

// One row of the "All" tab: a case that ran in the latest run, or a catalog case outside it.
type AnyCase = { key: string; ran: CaseResult | null; outside: OutsideCase | null }

function CheckPage() {
  const { project, check, latest } = Route.useLoaderData()
  const { token } = theme.useToken()

  const failed = check.notPassed
  const failedIds = new Set(failed.map((item) => item.case))
  const passed = (latest?.summary ?? []).filter((item) => !failedIds.has(item.case))
  const drafts = check.outsideRun.filter((item) => item.status === 'draft')
  const manual = check.outsideRun.filter((item) => item.status !== 'draft')
  const all: AnyCase[] = [
    ...(latest?.summary ?? []).map((item) => ({ key: item.case, ran: item, outside: null })),
    ...check.outsideRun.map((item) => ({ key: item.case, ran: null, outside: item })),
  ].sort((a, b) => a.key.localeCompare(b.key))

  const caseLink = (id: string, title: string) => (
    <Flex vertical>
      <Link to="/p/$project/checks/$check/cases/$case" params={{ project: project.slug, check: check.slug, case: id }}>
        {id}
      </Link>
      <Typography.Text type="secondary">{title.replace(/^[A-Z0-9-]+:\s*/, '')}</Typography.Text>
    </Flex>
  )

  const ranColumns = (onlyNotPassed: boolean): TableColumnsType<CaseResult> => [
    { title: 'Case', dataIndex: 'case', render: (id: string, item) => caseLink(id, item.title) },
    { title: 'Status', dataIndex: 'status', render: (status: CaseResult['status']) => <CaseStatusTag status={status} /> },
    {
      title: onlyNotPassed ? 'Then not passed' : 'Then',
      dataIndex: 'thens',
      render: (thens: CaseResult['thens']) => (
        <Flex gap="small" wrap>
          {thens.filter((then) => !onlyNotPassed || then.status !== 'passed')
            .map((then) => <ThenTag key={then.id} id={then.id} status={then.status} />)}
        </Flex>
      ),
    },
    { title: 'Duration', dataIndex: 'ms', render: (ms: number | null) => (ms === null ? '—' : `${(ms / 1000).toFixed(1)}s`) },
  ]

  const outsideColumns: TableColumnsType<OutsideCase> = [
    { title: 'Why not run', key: 'kind', width: 120, render: (_, item) => <OutsideRunTag status={item.status} run={item.run} /> },
    { title: 'Case', dataIndex: 'case', render: (id: string, item) => caseLink(id, item.title) },
  ]

  const allColumns: TableColumnsType<AnyCase> = [
    {
      title: 'Case',
      key: 'case',
      render: (_, row) => caseLink(row.key, row.ran?.title ?? row.outside?.title ?? ''),
    },
    {
      title: 'Result',
      key: 'result',
      render: (_, row) => row.ran
        ? <CaseStatusTag status={failedIds.has(row.key) && row.ran.status === 'passed' ? 'failed' : row.ran.status} />
        : <OutsideRunTag status={row.outside!.status} run={row.outside!.run} />,
    },
  ]

  const failedTable = (
    <Table
      rowKey="case"
      size="small"
      pagination={false}
      scroll={{ x: 'max-content' }}
      columns={ranColumns(true)}
      dataSource={failed}
      locale={{ emptyText: <Empty description="No failed cases in the latest run." /> }}
      expandable={{
        defaultExpandAllRows: true,
        rowExpandable: (item) => Boolean(item.error),
        expandedRowRender: (item) => <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{item.error}</pre>,
      }}
    />
  )

  const outsideTable = (rows: OutsideCase[], empty: string) => (
    <Table
      rowKey="case"
      size="small"
      pagination={false}
      columns={outsideColumns}
      dataSource={rows}
      locale={{ emptyText: <Empty description={empty} /> }}
      expandable={{
        defaultExpandAllRows: true,
        rowExpandable: (item) => Boolean(item.note),
        expandedRowRender: (item) => <Typography.Paragraph style={{ margin: 0 }}>{item.note}</Typography.Paragraph>,
      }}
    />
  )

  const counts = [
    { key: 'total', title: 'Total cases', value: all.length },
    { key: 'passed', title: 'Passed', value: passed.length, color: token.colorSuccess },
    { key: 'failed', title: 'Failed', value: failed.length, color: failed.length ? token.colorError : undefined },
    { key: 'draft', title: 'Draft', value: drafts.length, color: drafts.length ? token.orange : undefined },
    { key: 'manual', title: 'Manual', value: manual.length },
  ]

  return (
    <Flex vertical gap="middle">
      <Breadcrumb
        items={[
          { title: <Link to="/p/$project" params={{ project: project.slug }}>{project.name}</Link> },
          { title: check.name },
        ]}
      />
      <Card title={`${check.name} · ${check.environment}`} extra={<CheckStatusTag status={check.status} />}>
        <ActiveRunNotice active={check.active} />
        <PartialRunNotice partial={check.partial} />
        {latest ? (
          <Flex vertical gap="middle">
            <Flex gap="small" align="center" wrap>
              <Typography.Text type="secondary">Last run</Typography.Text>
              <Typography.Text strong>{utc(latest.finishedAt)}</Typography.Text>
              <OutcomeTag run={latest} />
              <TriggerTag trigger={latest.trigger} />
            </Flex>
            <Row gutter={[token.margin, token.margin]}>
              {counts.map((item) => (
                <Col key={item.key} xs={12} sm={8} md={4}>
                  <Statistic title={item.title} value={item.value} styles={{ content: item.color ? { color: item.color } : undefined }} />
                </Col>
              ))}
            </Row>
            {/* Failed cases are listed in the Failed tab; only an incomplete run needs its reason here. */}
            {latest.reason && latest.outcome === 'incomplete' && (
              <Alert type="warning" showIcon title={latest.reason} />
            )}
          </Flex>
        ) : (
          <Empty description="No finished runs yet." />
        )}
        <Descriptions
          size="small"
          style={{ marginTop: token.margin }}
          column={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2, xxl: 2 }}
          items={[
            { key: 'schedule', label: 'Schedule', children: scheduleText(check.periodSeconds, check.graceSeconds) },
            { key: 'next', label: 'Next expected', children: utc(check.nextExpectedAt) },
          ]}
        />
        {latest && (
          <Collapse
            ghost
            size="small"
            style={{ marginTop: token.marginSM }}
            items={[{
              key: 'run-details',
              label: 'Run details',
              children: (
                <Descriptions
                  size="small"
                  column={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2, xxl: 2 }}
                  items={[
                    { key: 'started', label: 'Started', children: utc(latest.startedAt) },
                    { key: 'exit', label: 'Exit code', children: latest.exitCode ?? '—' },
                    { key: 'test', label: 'Test SHA', children: <Sha value={latest.testSha} /> },
                    {
                      key: 'runner',
                      label: 'Runner',
                      children: latest.runUrl ? (
                        <Typography.Link href={latest.runUrl} target="_blank" rel="noreferrer">
                          {latest.runnerKind ?? 'Open run'} <ExportOutlined />
                        </Typography.Link>
                      ) : (latest.runnerKind ?? '—'),
                    },
                    ...versionNames(latest.deployedStart, latest.deployedEnd).flatMap((name) => [
                      { key: `${name}-start`, label: `${name} at start`, children: <Sha value={latest.deployedStart?.[name]} /> },
                      { key: `${name}-end`, label: `${name} at end`, children: <Sha value={latest.deployedEnd?.[name]} /> },
                    ]),
                  ]}
                />
              ),
            }]}
          />
        )}
      </Card>
      {latest && (
        <Card>
          <Tabs
            defaultActiveKey="failed"
            items={[
              { key: 'failed', label: `Failed (${failed.length})`, children: failedTable },
              {
                key: 'passed',
                label: `Passed (${passed.length})`,
                children: (
                  <Table
                    rowKey="case"
                    size="small"
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                    columns={ranColumns(false)}
                    dataSource={passed}
                    locale={{ emptyText: <Empty description="No passed cases in the latest run." /> }}
                  />
                ),
              },
              { key: 'draft', label: `Draft (${drafts.length})`, children: outsideTable(drafts, 'No draft cases.') },
              { key: 'manual', label: `Manual (${manual.length})`, children: outsideTable(manual, 'No manual-only cases.') },
              {
                key: 'all',
                label: `All (${all.length})`,
                children: (
                  <Table rowKey="key" size="small" pagination={false} columns={allColumns} dataSource={all} />
                ),
              },
            ]}
          />
        </Card>
      )}
    </Flex>
  )
}
