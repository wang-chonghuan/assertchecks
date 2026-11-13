import { useCallback, useEffect, useState } from 'react'
import { Alert, Card, Col, Empty, Flex, Row, Skeleton, Tag, Typography } from 'antd'
import { getOnCallAlerts } from '../server/fns'
import { utc } from './status'
import type { OnCallAlerts } from '../lib/types'
import { space, text } from '../infui/tokens'

// The Alerts tab's content (ASSERT-57), BF only. Read-only: who covers out-of-hours critical alerts this
// week and the next two, a short policy of who handles what and how to acknowledge, and the filed tickets
// still awaiting a reply. It carries no phone numbers or credentials. The tab shows only for a project that
// has alert configuration.
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
    return <Alert type="error" showIcon title="Could not load alerts" description={failed} />
  }
  if (!data) {
    return <Card><Skeleton active paragraph={{ rows: 2 }} /></Card>
  }
  // Defensive: the tab is only shown for a configured project, so this is not normally reached.
  if (!data.configured) {
    return <Card><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Alerts are not configured for this project." /></Card>
  }

  const who = (name: string | null, fallback: string) => name ?? fallback

  return (
    <Flex vertical gap={space.group}>
      <Row gutter={[space.group, space.group]}>
        <Col xs={24} md={12}>
          <Card title="On call" style={{ height: '100%' }}>
            {data.onCall.length === 0 ? (
              <Typography.Text style={text.caption}>No rotation configured.</Typography.Text>
            ) : (
              <Flex vertical gap={space.stack}>
                {data.onCall.map((week, index) => (
                  <Flex key={week.weekOf} align="baseline" gap={space.stack} wrap>
                    <Typography.Text style={text.label}>{week.name ?? '—'}</Typography.Text>
                    {week.role && <Tag>{ROLE_LABEL[week.role]}</Tag>}
                    <Typography.Text style={text.caption}>{index === 0 ? 'this week' : `from ${utc(week.weekOf)}`}</Typography.Text>
                  </Flex>
                ))}
                {!data.workingHours && (
                  <Typography.Text style={{ ...text.caption, marginTop: space.stack }}>
                    Outside Ireland working hours — critical alerts call the week&rsquo;s on-call person.
                  </Typography.Text>
                )}
              </Flex>
            )}
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Alert policy" style={{ height: '100%' }}>
            <Flex vertical gap={space.stack}>
              <Flex gap={space.stack} wrap align="baseline">
                <Tag>Low</Tag>
                <Typography.Text style={text.body}>Posted to Slack only — no call, no escalation.</Typography.Text>
              </Flex>
              <Flex gap={space.stack} wrap align="baseline">
                <Tag color="warning">Urgent</Tag>
                <Typography.Text style={text.body}>
                  Slack {who(data.roles.primary, 'the primary')}; acknowledge within one working hour, or
                  {' '}{who(data.roles.backup, 'the backup')} is called. Working hours only (Mon–Fri 09:00–17:30 Ireland).
                </Typography.Text>
              </Flex>
              <Flex gap={space.stack} wrap align="baseline">
                <Tag color="error">Critical</Tag>
                <Typography.Text style={text.body}>
                  A service outage. Acknowledge within 30 minutes. In hours: {who(data.roles.primary, 'the primary')} at once,
                  {' '}{who(data.roles.backup, 'the backup')} at +15 min, {who(data.roles.final, 'the final person')} at +30 min — each called.
                  Outside hours: the week&rsquo;s on-call person, re-called about every 15 minutes.
                </Typography.Text>
              </Flex>
              <Typography.Text style={text.caption}>
                Acknowledge by replying on the ticket; only a reply from {who(data.roles.primary, 'the primary')},
                {' '}{who(data.roles.backup, 'the backup')} or {who(data.roles.final, 'the final person')} stops escalation.
              </Typography.Text>
            </Flex>
          </Card>
        </Col>
      </Row>

      <Card title="Active alerts">
        {data.alerts.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No active alerts" />
        ) : (
          <Flex vertical gap={space.stack}>
            {data.alerts.map((alert) => (
              <Flex key={alert.url} align="baseline" gap={space.stack} wrap>
                <Tag color={alert.severity === 'critical' ? 'error' : 'warning'}>{SEVERITY_LABEL[alert.severity]}</Tag>
                <Typography.Link href={alert.url} target="_blank" rel="noreferrer" style={text.label}>Ticket</Typography.Link>
                <Typography.Text style={text.caption}>opened {utc(alert.openedAt)} · unacknowledged</Typography.Text>
              </Flex>
            ))}
          </Flex>
        )}
      </Card>
    </Flex>
  )
}
