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

// One row of the "All" tab: a case that ran in the latest run, or a catalog case outside it.
type AnyCase = { key: string; ran: CaseResult | null; outside: OutsideCase | null }

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
  const allRows: AnyCase[] = [
    ...(latest?.summary ?? []).map((item) => ({ key: item.case, ran: item, outside: null })),
    ...check.outsideRun.map((item) => ({ key: item.case, ran: null, outside: item })),
  ].sort((a, b) => a.key.localeCompare(b.key))
  const failed = allFailed.filter((item) => shown(item.case))
  const passed = (latest?.summary ?? []).filter((item) => !failedIds.has(item.case) && shown(item.case))
  const drafts = check.outsideRun.filter((item) => item.status === 'draft' && shown(item.case))
  const manual = check.outsideRun.filter((item) => item.status !== 'draft' && shown(item.case))
  const all = allRows.filter((row) => shown(row.key))
  const filtered = groupFilter !== undefined || tagFilter !== undefined

  const ids = allRows.map((row) => row.key)
  const groupOptions = groupOrder(ids.map((id) => metaOf(id).group))
    .map((group) => ({ value: group ?? UNGROUPED_KEY, label: group ?? UNGROUPED }))
  const tagOptions = [...new Set(ids.flatMap((id) => metaOf(id).tags))].sort((a, b) => a.localeCompare(b))
    .map((tag) => ({ value: tag, label: tag }))
  const organized = groupOptions.some((option) => option.value !== UNGROUPED_KEY) || tagOptions.length > 0

  // Each tab lists its cases in group sections, every case once; a catalog without groups keeps one
  // plain table.
  const byGroup = <T,>(rows: T[], id: (row: T) => string, table: (rows: T[]) => ReactNode) => {
    const groups = groupOrder(rows.map((row) => metaOf(id(row)).group))
    if (groups.length === 0 || (groups.length === 1 && groups[0] === null)) return table(rows)
    return (
      <Flex vertical gap="large">
        {groups.map((group) => {
          const inGroup = rows.filter((row) => metaOf(id(row)).group === group)
          return (
            <Flex key={group ?? UNGROUPED_KEY} vertical gap="small">
              <Flex align="center" gap="small">
                <Typography.Text strong type={group === null ? 'secondary' : undefined}>{group ?? UNGROUPED}</Typography.Text>
                <Tag variant="filled">{inGroup.length}</Tag>
              </Flex>
              {table(inGroup)}
            </Flex>
          )
        })}
      </Flex>
    )
  }

  const tagsColumn = <T,>(id: (row: T) => string) => ({
    title: 'Tags',
    key: 'tags',
    render: (_: unknown, row: T) => {
      const tags = metaOf(id(row)).tags
      return tags.length ? <Flex gap={token.marginXXS} wrap>{tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</Flex> : null
    },
  })

  const caseLink = (id: string, title: string) => (
    <Flex vertical>
      <Link to="/p/$project/checks/$check/cases/$case" params={{ project: project.slug, check: check.slug, case: id }}>
        {id}
      </Link>
      <Typography.Text type="secondary">{title.replace(/^[A-Z0-9-]+:\s*/, '')}</Typography.Text>
    </Flex>
  )

  // Fixed leading widths keep columns aligned across group sections.
  const caseWidth = token.controlHeight * 10
  const resultWidth = token.controlHeight * 4
  const ranColumns = (onlyNotPassed: boolean): TableColumnsType<CaseResult> => [
    { title: 'Case', dataIndex: 'case', width: caseWidth, render: (id: string, item) => caseLink(id, item.title) },
    { title: 'Status', dataIndex: 'status', width: resultWidth, render: (status: CaseResult['status']) => <CaseStatusTag status={status} /> },
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
    tagsColumn<CaseResult>((item) => item.case),
    { title: 'Duration', dataIndex: 'ms', render: (ms: number | null) => (ms === null ? '—' : `${(ms / 1000).toFixed(1)}s`) },
  ]

  const outsideColumns: TableColumnsType<OutsideCase> = [
    { title: 'Why not run', key: 'kind', width: resultWidth, render: (_, item) => <OutsideRunTag status={item.status} run={item.run} /> },
    { title: 'Case', dataIndex: 'case', width: caseWidth, render: (id: string, item) => caseLink(id, item.title) },
    tagsColumn<OutsideCase>((item) => item.case),
  ]

  const allColumns: TableColumnsType<AnyCase> = [
    {
      title: 'Case',
      key: 'case',
      width: caseWidth,
      render: (_, row) => caseLink(row.key, row.ran?.title ?? row.outside?.title ?? ''),
    },
    {
      title: 'Result',
      key: 'result',
      width: resultWidth,
      render: (_, row) => row.ran
        ? <CaseStatusTag status={failedIds.has(row.key) && row.ran.status === 'passed' ? 'failed' : row.ran.status} />
        : <OutsideRunTag status={row.outside!.status} run={row.outside!.run} />,
    },
    tagsColumn<AnyCase>((row) => row.key),
  ]

  const failedTable = (rows: CaseResult[]) => (
    <Table
      rowKey="case"
      size="small"
      pagination={false}
      scroll={{ x: 'max-content' }}
      columns={ranColumns(true)}
      dataSource={rows}
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


  return (
    <Flex vertical gap="middle">
      <Breadcrumb
        items={[
          { title: <Link to="/p/$project" params={{ project: project.slug }}>{project.name}</Link> },
          { title: check.name },
        ]}
      />
      <Card title={`${check.name} · ${check.environment}`} extra={<CheckStatusTag status={check.status} />}>
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
                <Typography.Text type="secondary">
                  Showing {all.length} of {allRows.length} cases. The run's outcome and counts above cover every case.
                </Typography.Text>
              )}
            </Flex>
          )}
          <Tabs
            defaultActiveKey="failed"
            items={[
              { key: 'failed', label: `Failed (${failed.length})`, children: byGroup(failed, (item) => item.case, failedTable) },
              {
                key: 'passed',
                label: `Passed (${passed.length})`,
                children: byGroup(passed, (item) => item.case, (rows) => (
                  <Table
                    rowKey="case"
                    size="small"
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                    columns={ranColumns(false)}
                    dataSource={rows}
                    locale={{ emptyText: <Empty description="No passed cases in the latest run." /> }}
                  />
                )),
              },
              { key: 'draft', label: `Draft (${drafts.length})`, children: byGroup(drafts, (item) => item.case, (rows) => outsideTable(rows, 'No draft cases.')) },
              { key: 'manual', label: `Manual (${manual.length})`, children: byGroup(manual, (item) => item.case, (rows) => outsideTable(rows, 'No manual-only cases.')) },
              {
                key: 'all',
                label: `All (${all.length})`,
                children: byGroup(all, (row) => row.key, (rows) => (
                  <Table rowKey="key" size="small" pagination={false} columns={allColumns} dataSource={rows} />
                )),
              },
            ]}
          />
        </Card>
      )}
    </Flex>
  )
}
