import { Link, createFileRoute } from '@tanstack/react-router'
import { Breadcrumb, Card, Collapse, Descriptions, Empty, Flex, Select, Table, Tabs, Tag, Typography, theme } from 'antd'
import type { TableColumnsType } from 'antd'
import { useState, type ReactNode } from 'react'
import { ExportOutlined } from '@ant-design/icons'
import {
  CaseStatusTag, CheckStatusTag, OutsideRunTag, Sha, ThenTag, utc,
} from '../../../../../../components/status'
import { getCheck } from '../../../../../../server/fns'
import type { CaseResult, OutsideCase, Versions } from '../../../../../../lib/types'
import { PRODUCT_NAME } from '../../../../../../components/brand'
import { CheckSummary } from '../../../../../../components/check-summary'
import { UNGROUPED, groupOrder, type CaseMeta } from '../../../../../../lib/organize'

export const Route = createFileRoute('/_app/p/$project/checks/$check/')({
  loader: ({ params }) => getCheck({ data: { project: params.project, check: params.check } }),
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.check.name ?? 'Check'} · ${PRODUCT_NAME}` }] }),
  component: CheckPage,
})

// Every tested component either snapshot names, in a stable order.
function versionNames(start: Versions | null, end: Versions | null): string[] {
  return [...new Set([...Object.keys(start ?? {}), ...Object.keys(end ?? {})])].sort()
}

// The filter value for cases without a group; the select needs a string.
const UNGROUPED_KEY = '\u0000ungrouped'

function CheckPage() {
  const { project, check, latest, caseMeta } = Route.useLoaderData()
  const { token } = theme.useToken()
  // Filters only narrow what is listed; the summary card's outcome and counts stay whole.
  const [groupFilter, setGroupFilter] = useState<string>()
  const [tagFilter, setTagFilter] = useState<string>()
  const metaOf = (id: string): CaseMeta => caseMeta[id] ?? { group: null, tags: [] }
  const shown = (id: string) =>
    (groupFilter === undefined || (metaOf(id).group ?? UNGROUPED_KEY) === groupFilter) &&
    (tagFilter === undefined || metaOf(id).tags.includes(tagFilter))

  const allFailed = check.notPassed
  const failedIds = new Set(allFailed.map((item) => item.case))
  const ids = [...(latest?.summary ?? []).map((item) => item.case), ...check.outsideRun.map((item) => item.case)]
  const failed = allFailed.filter((item) => shown(item.case))
  const passed = (latest?.summary ?? []).filter((item) => !failedIds.has(item.case) && shown(item.case))
  const outside = check.outsideRun.filter((item) => shown(item.case))
  const showing = ids.filter(shown).length
  const filtered = groupFilter !== undefined || tagFilter !== undefined

  const groupOptions = groupOrder(ids.map((id) => metaOf(id).group))
    .map((group) => ({ value: group ?? UNGROUPED_KEY, label: group ?? UNGROUPED }))
  const tagOptions = [...new Set(ids.flatMap((id) => metaOf(id).tags))].sort((a, b) => a.localeCompare(b))
    .map((tag) => ({ value: tag, label: tag }))
  const organized = groupOptions.some((option) => option.value !== UNGROUPED_KEY) || tagOptions.length > 0

  // Each tab lists its cases in group sections, every case once; a catalog without groups keeps one
  // plain table.
  const byGroup = <T,>(rows: T[], id: (row: T) => string, table: (rows: T[], header: boolean) => ReactNode) => {
    const groups = groupOrder(rows.map((row) => metaOf(id(row)).group))
    if (groups.length === 0 || (groups.length === 1 && groups[0] === null)) return table(rows, true)
    return (
      <Flex vertical gap="large">
        {groups.map((group, index) => {
          const inGroup = rows.filter((row) => metaOf(id(row)).group === group)
          return (
            <Flex key={group ?? UNGROUPED_KEY} vertical gap="small">
              <Flex align="center" gap="small">
                <Typography.Text strong type={group === null ? 'secondary' : undefined}>{group ?? UNGROUPED}</Typography.Text>
                <Tag variant="filled">{inGroup.length}</Tag>
              </Flex>
              {table(inGroup, index === 0)}
            </Flex>
          )
        })}
      </Flex>
    )
  }

  const caseLink = (id: string, title: string, extra?: ReactNode) => (
    <Flex vertical>
      <Flex gap="small" align="center" wrap>
        <Link to="/p/$project/checks/$check/cases/$case" params={{ project: project.slug, check: check.slug, case: id }}>
          {id}
        </Link>
        {extra}
      </Flex>
      <Typography.Text type="secondary">{title.replace(/^[A-Z0-9-]+:\s*/, '')}</Typography.Text>
    </Flex>
  )
  // The first line of a native error is its message; the rest is call-site detail for the expanded row.
  const firstLine = (error: string | null) =>
    error?.split('\n').find((line) => line.trim())?.trim().replace(/^Error:\s*/, '') ?? null

  // Fixed leading widths keep columns aligned across group sections.
  const caseWidth = token.controlHeight * 10
  const resultWidth = token.controlHeight * 4
  const failedColumns: TableColumnsType<CaseResult> = [
    {
      title: 'Case',
      dataIndex: 'case',
      width: caseWidth,
      // A plain failure is what this tab is; only another status needs saying.
      render: (id: string, item) => caseLink(id, item.title, item.status === 'failed' || item.status === 'passed' ? null : <CaseStatusTag status={item.status} />),
    },
    {
      title: 'Where it stopped',
      dataIndex: 'thens',
      width: resultWidth,
      render: (thens: CaseResult['thens'], item) => {
        // A case that failed before its first Then has no Then to blame; say so once.
        if (item.status !== 'passed' && !thens.some((then) => then.status !== 'not_run')) {
          return <Tag color="error">Before the checks</Tag>
        }
        return (
          <Flex gap="small" wrap>
            {thens.filter((then) => then.status !== 'passed')
              .map((then) => <ThenTag key={then.id} id={then.id} status={then.status} caseStatus={item.status} />)}
          </Flex>
        )
      },
    },
    {
      title: 'Error',
      dataIndex: 'error',
      // Phones read the error on the expanded row or the case page instead of scrolling sideways.
      responsive: ['md'],
      render: (error: string | null) => firstLine(error)
        ? <Typography.Text ellipsis={{ tooltip: false }} style={{ maxWidth: token.controlHeight * 16 }}>{firstLine(error)}</Typography.Text>
        : <Typography.Text type="secondary">—</Typography.Text>,
    },
  ]
  const passedColumns: TableColumnsType<CaseResult> = [
    { title: 'Case', dataIndex: 'case', render: (id: string, item) => caseLink(id, item.title) },
  ]
  const outsideColumns: TableColumnsType<OutsideCase> = [
    { title: 'Case', dataIndex: 'case', width: caseWidth, render: (id: string, item) => caseLink(id, item.title) },
    { title: 'Why', key: 'kind', render: (_, item) => <OutsideRunTag status={item.status} run={item.run} /> },
  ]

  const failedTable = (rows: CaseResult[], header: boolean) => (
    <Table
      showHeader={header}
      rowKey="case"
      size="small"
      pagination={false}
      scroll={{ x: 'max-content' }}
      columns={failedColumns}
      dataSource={rows}
      locale={{ emptyText: <Empty description="No failed cases in the latest run." /> }}
      expandable={{
        rowExpandable: (item) => Boolean(item.error),
        expandedRowRender: (item) => <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{item.error}</pre>,
      }}
    />
  )

  const outsideTable = (rows: OutsideCase[], header: boolean, empty: string) => (
    <Table
      showHeader={header}
      rowKey="case"
      size="small"
      pagination={false}
      columns={outsideColumns}
      dataSource={rows}
      locale={{ emptyText: <Empty description={empty} /> }}
      expandable={{
        rowExpandable: (item) => Boolean(item.note),
        expandedRowRender: (item) => <Typography.Paragraph style={{ margin: 0 }}>{item.note}</Typography.Paragraph>,
      }}
    />
  )


  return (
    <Flex vertical gap="middle">
      <Breadcrumb
        items={[
          { title: <Link to="/p/$project" params={{ project: project.slug }}>{project.name}</Link> },
          { title: check.name },
        ]}
      />
      <Card title={check.name} extra={<CheckStatusTag status={check.status} />} styles={{ body: { paddingTop: token.paddingXXS } }}>
        <CheckSummary check={check} />
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
          {organized && (
            <Flex gap="small" wrap align="center" style={{ marginBottom: token.marginSM }}>
              <Select
                allowClear
                aria-label="Filter by group"
                placeholder="All groups"
                value={groupFilter}
                onChange={setGroupFilter}
                options={groupOptions}
                style={{ minWidth: token.controlHeight * 5 }}
              />
              <Select
                allowClear
                showSearch
                aria-label="Filter by tag"
                placeholder="All tags"
                value={tagFilter}
                onChange={setTagFilter}
                options={tagOptions}
                style={{ minWidth: token.controlHeight * 5 }}
              />
              {filtered && (
                <Typography.Text type="secondary">Showing {showing} of {ids.length} cases</Typography.Text>
              )}
            </Flex>
          )}
          <Tabs
            defaultActiveKey={failed.length ? 'failed' : 'passed'}
            items={[
              { key: 'failed', label: `Not passed (${failed.length})`, children: byGroup(failed, (item) => item.case, failedTable) },
              {
                key: 'passed',
                label: `Passed (${passed.length})`,
                children: byGroup(passed, (item) => item.case, (rows) => (
                  <Table
                    showHeader={false}
                    rowKey="case"
                    size="small"
                    pagination={false}
                    columns={passedColumns}
                    dataSource={rows}
                    locale={{ emptyText: <Empty description="No passed cases in the latest run." /> }}
                  />
                )),
              },
              {
                key: 'outside',
                label: `Not in this run (${outside.length})`,
                children: byGroup(outside, (item) => item.case, (rows, header) => outsideTable(rows, header, 'Every catalog case ran.')),
              },
            ]}
          />
        </Card>
      )}
    </Flex>
  )
}
