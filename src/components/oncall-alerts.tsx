import { useCallback, useEffect, useState } from 'react'
import { Alert, Card, Empty, Flex, Skeleton, Tag, Typography } from 'antd'
import { getOnCallAlerts } from '../server/fns'
import { utc } from './status'
import type { OnCallAlerts } from '../lib/types'
import { space, text } from '../infui/tokens'

// The on-call & alerts card (ASSERT-57), shown at the top of a project's Production errors tab. Read-only:
// who covers out-of-hours critical alerts this week and next, and the filed tickets still awaiting a reply.
// It carries no phone numbers or credentials. A project with no alert configuration renders nothing.
const ROLE_LABEL: Record<'primary' | 'backup' | 'final', string> = { primary: 'Primary', backup: 'Backup', final: 'Final' }
const SEVERITY_LABEL: Record<'urgent' | 'critical', string> = { urgent: 'Urgent', critical: 'Critical' }

export function OnCallAlertsCard({ project }: { project: string }) {
  const [data, setData] = useState<OnCallAlerts | null>(null)
  const [failed, setFailed] = useState<string | null>(null)

  const load = useCallback(async () => {
    setFailed(null)
    try {
      setData(await getOnCallAlerts({ data: { project } }))
    } catch (error) {
      setFailed((error as Error).message)
    }
  }, [project])

  useEffect(() => { void load() }, [load])

  if (failed) {
    return <Alert type="error" showIcon title="Could not load on-call status" description={failed} style={{ marginBottom: space.group }} />
  }
  if (!data) {
    return <Card style={{ marginBottom: space.group }}><Skeleton active paragraph={{ rows: 2 }} /></Card>
  }
  // A project with no alert configuration (e.g. nsdk): the card is not shown at all.
  if (!data.configured) return null

  return (
    <Card title="On call & alerts" style={{ marginBottom: space.group }}>
      <Flex vertical gap={space.block}>
        <Flex vertical gap={space.stack}>
          <Typography.Text style={text.heading3}>On call</Typography.Text>
          {data.onCall.length === 0 ? (
            <Typography.Text style={text.caption}>No rotation configured</Typography.Text>
          ) : (
            data.onCall.map((week, index) => (
              <Flex key={week.weekOf} align="baseline" gap={space.stack} wrap>
                <Typography.Text style={text.label}>{week.name ?? '—'}</Typography.Text>
                {week.role && <Tag>{ROLE_LABEL[week.role]}</Tag>}
                <Typography.Text style={text.caption}>{index === 0 ? 'this week' : `from ${utc(week.weekOf)}`}</Typography.Text>
              </Flex>
            ))
          )}
          {!data.workingHours && (
            <Typography.Text style={text.caption}>
              Outside Ireland working hours — critical alerts call the week&rsquo;s on-call person.
            </Typography.Text>
          )}
        </Flex>

        <Flex vertical gap={space.stack}>
          <Typography.Text style={text.heading3}>Active alerts</Typography.Text>
          {data.alerts.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No active alerts" />
          ) : (
            data.alerts.map((alert) => (
              <Flex key={alert.url} align="baseline" gap={space.stack} wrap>
                <Tag color={alert.severity === 'critical' ? 'error' : 'warning'}>{SEVERITY_LABEL[alert.severity]}</Tag>
                <Typography.Link href={alert.url} target="_blank" rel="noreferrer" style={text.label}>Ticket</Typography.Link>
                <Typography.Text style={text.caption}>opened {utc(alert.openedAt)} · unacknowledged</Typography.Text>
              </Flex>
            ))
          )}
        </Flex>
      </Flex>
    </Card>
  )
}
