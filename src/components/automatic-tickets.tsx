// Automatic tickets for production errors (ASSERT-49): where a project's tickets go and which Slack
// channel hears about them. Keys typed here go to the server and are never shown again.
import { Alert, App, Button, Card, Flex, Form, Input, Modal, Popconfirm, Select, Typography, theme } from 'antd'
import { useEffect, useState } from 'react'
import {
  getTicketPeople, getTicketTargets, removeTicketDestination, saveSlackChannel, saveTicketDestination,
} from '../server/fns'
import type { AutomationView, TicketPlatform } from '../lib/types'
import { utc } from './status'
import { space, text } from '../infui/tokens'

const PLATFORM: Record<TicketPlatform, string> = { plane: 'Plane', linear: 'Linear' }

interface Target { id: string; name: string; teamId: string | null }
// A Linear project shared by several teams appears once per team, so an option is the pair.
const optionOf = (target: { id: string; teamId: string | null }) => `${target.id}/${target.teamId ?? ''}`
interface Person { id: string; name: string }

interface DestinationForm { platform: TicketPlatform; workspace?: string; token?: string; target?: string; assignee?: string }

// Choosing where tickets go: the platform and its key, then a project and an assignee from that platform.
function DestinationModal({ open, project, current, onCancel, onSaved }: {
  open: boolean
  project: string
  current: AutomationView | null
  onCancel: () => void
  onSaved: () => Promise<void>
}) {
  const { message } = App.useApp()
  const [form] = Form.useForm<DestinationForm>()
  const platform = Form.useWatch('platform', form)
  const [account, setAccount] = useState<string | null>(null)
  const [targets, setTargets] = useState<Target[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    form.setFieldsValue({ platform: current?.platform ?? 'linear', workspace: current?.workspace ?? undefined, token: undefined, target: undefined, assignee: undefined })
    setAccount(null); setTargets([]); setPeople([]); setProblem(null)
  }, [open, current, form])

  const accessFields = () => {
    const values = form.getFieldsValue()
    return { project, platform: values.platform, workspace: values.workspace?.trim(), token: values.token?.trim() || undefined }
  }

  // A saved key is kept when the platform and workspace stay the same, so the form can load without retyping it.
  const keyIsSaved = Boolean(current?.platform && current.platform === platform)

  const load = async () => {
    setLoading(true); setProblem(null); setPeople([])
    try {
      const reply = await getTicketTargets({ data: accessFields() })
      setAccount(reply.account)
      setTargets(reply.targets)
      const saved = current?.target ? reply.targets.find((target) => target.id === current.target?.id && target.name === current.target?.name) : undefined
      const keep = saved ? optionOf(saved) : undefined
      form.setFieldsValue({ target: keep, assignee: undefined })
      if (keep) await loadPeople(keep, reply.targets)
    } catch (error) {
      setAccount(null); setTargets([])
      setProblem((error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const loadPeople = async (option: string, list = targets) => {
    const target = list.find((item) => optionOf(item) === option)
    if (!target) return
    try {
      const reply = await getTicketPeople({ data: { ...accessFields(), target } })
      setPeople(reply)
      const keep = current?.assignee && reply.some((person) => person.id === current.assignee?.id) ? current.assignee.id : undefined
      form.setFieldsValue({ assignee: keep })
    } catch (error) {
      setPeople([])
      setProblem((error as Error).message)
    }
  }

  const save = async () => {
    const values = await form.validateFields()
    const target = targets.find((item) => optionOf(item) === values.target)
    if (!target) return
    const assignee = people.find((person) => person.id === values.assignee) ?? null
    setSaving(true)
    try {
      await saveTicketDestination({ data: { ...accessFields(), target, assignee } })
      await onSaved()
    } catch (error) {
      message.error(`Saving failed: ${(error as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Where tickets go"
      okText="Save"
      okButtonProps={{ disabled: !targets.length }}
      confirmLoading={saving}
      onCancel={onCancel}
      onOk={save}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onValuesChange={(changed) => {
        // A different platform, workspace or key means the lists below no longer apply.
        if ('platform' in changed || 'workspace' in changed || 'token' in changed) { setAccount(null); setTargets([]); setPeople([]) }
        if ('target' in changed) { form.setFieldsValue({ assignee: undefined }); void loadPeople(changed.target as string) }
      }}>
        <Form.Item name="platform" label="Platform" rules={[{ required: true }]}>
          <Select options={(['linear', 'plane'] as const).map((value) => ({ value, label: PLATFORM[value] }))} />
        </Form.Item>
        {platform === 'plane' && (
          <Form.Item name="workspace" label="Plane workspace" extra="The part after app.plane.so/ in your Plane address." rules={[{ required: true, whitespace: true }]}>
            <Input placeholder="e.g. intentmill" />
          </Form.Item>
        )}
        <Form.Item
          name="token"
          label={platform === 'plane' ? 'Plane API token' : 'Linear API key'}
          extra={platform === 'plane'
            ? 'Plane: Profile settings › Personal access tokens. Tickets are created as its owner.'
            : 'Linear: Settings › Security & access › Personal API keys. Tickets are created as its owner.'}
          rules={keyIsSaved ? [] : [{ required: true, whitespace: true, message: 'Enter the key.' }]}
        >
          <Input.Password placeholder={keyIsSaved ? 'Saved key; type a new one to replace it' : undefined} autoComplete="off" />
        </Form.Item>
        <Flex vertical gap={space.stack}>
          <Flex gap={space.stack} align="center" wrap>
            <Button onClick={() => void load()} loading={loading}>Load projects</Button>
            {account && <Typography.Text style={text.caption}>Connected as {account}</Typography.Text>}
          </Flex>
          {problem && <Alert type="error" showIcon title={problem} />}
          {targets.length > 0 && (
            <>
              <Form.Item name="target" label={platform === 'plane' ? 'Project' : 'Team or project'} rules={[{ required: true, message: 'Choose where tickets go.' }]}>
                <Select showSearch={{ optionFilterProp: 'label' }} placeholder="Type to search" options={targets.map((target) => ({ value: optionOf(target), label: target.name }))} />
              </Form.Item>
              <Form.Item name="assignee" label="Assignee" extra="Leave empty to file tickets unassigned.">
                <Select allowClear showSearch={{ optionFilterProp: 'label' }} placeholder="Type to search" options={people.map((person) => ({ value: person.id, label: person.name }))} />
              </Form.Item>
            </>
          )}
        </Flex>
      </Form>
    </Modal>
  )
}

function SlackModal({ open, project, onCancel, onSaved }: { open: boolean; project: string; onCancel: () => void; onSaved: () => Promise<void> }) {
  const { message } = App.useApp()
  const [form] = Form.useForm<{ webhook: string }>()
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (open) form.setFieldsValue({ webhook: '' }) }, [open, form])
  return (
    <Modal
      open={open}
      title="Slack channel"
      okText="Send a test and save"
      confirmLoading={saving}
      onCancel={onCancel}
      onOk={async () => {
        const { webhook } = await form.validateFields()
        setSaving(true)
        try {
          await saveSlackChannel({ data: { project, webhook: webhook.trim() } })
          await onSaved()
        } catch (error) {
          message.error(`Saving failed: ${(error as Error).message}`)
        } finally {
          setSaving(false)
        }
      }}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="webhook"
          label="Incoming webhook"
          extra="In the AssertChecks Slack app: Incoming Webhooks › Add New Webhook, pick the channel and copy the address. A test message is sent before saving."
          rules={[{ required: true, whitespace: true, pattern: /^\s*https:\/\/hooks\.slack\.com\//, message: 'Paste an https://hooks.slack.com/… address.' }]}
        >
          <Input placeholder="https://hooks.slack.com/services/…" autoComplete="off" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export function AutomaticTicketsCard({ project, automation, onChanged }: { project: string; automation: AutomationView | null; onChanged: () => Promise<void> }) {
  const { message } = App.useApp()
  const { token } = theme.useToken()
  // The words take the row; on a phone the buttons move below them instead of squeezing them.
  const words = { flex: `1 1 ${token.controlHeight * 8}px`, minWidth: 0 }
  const [editing, setEditing] = useState<'destination' | 'slack' | null>(null)
  const run = async (change: () => Promise<unknown>) => {
    try { await change(); await onChanged() } catch (error) { message.error(`Saving failed: ${(error as Error).message}`) }
  }
  const saved = async () => { setEditing(null); await onChanged() }
  const active = automation?.active && automation.platform && automation.target

  return (
    <Card title="Automatic tickets">
      <Flex vertical gap={space.group}>
        <Flex justify="space-between" align="flex-start" gap={space.group} wrap>
          <Flex vertical style={words}>
            <Typography.Text style={text.label}>Tickets</Typography.Text>
            <Typography.Text style={text.body}>
              {active
                ? `Every error that needs a ticket gets one in ${automation.target?.name} on ${PLATFORM[automation.platform!]}, ${automation.assignee ? `assigned to ${automation.assignee.name}` : 'unassigned'}.`
                : 'Off. Choose where tickets go and every error that needs a ticket gets one within about 20 minutes.'}
            </Typography.Text>
          </Flex>
          <Flex gap={space.stack} wrap>
            <Button onClick={() => setEditing('destination')}>{active ? 'Change' : 'Choose where tickets go'}</Button>
            {active && (
              <Popconfirm title="Stop automatic tickets?" description="The saved key is forgotten. Tickets already filed stay." onConfirm={() => run(() => removeTicketDestination({ data: { project } }))}>
                <Button>Turn off</Button>
              </Popconfirm>
            )}
          </Flex>
        </Flex>
        <Flex justify="space-between" align="flex-start" gap={space.group} wrap>
          <Flex vertical style={words}>
            <Typography.Text style={text.label}>Slack</Typography.Text>
            <Typography.Text style={text.body}>
              {automation?.slack ? `Every ticket put on an error is posted through ${automation.slack}.` : 'No channel. Tickets are not posted to Slack.'}
            </Typography.Text>
          </Flex>
          <Flex gap={space.stack} wrap>
            <Button onClick={() => setEditing('slack')}>{automation?.slack ? 'Change' : 'Add a channel'}</Button>
            {automation?.slack && (
              <Popconfirm title="Stop posting to Slack?" onConfirm={() => run(() => saveSlackChannel({ data: { project, webhook: null } }))}>
                <Button>Remove</Button>
              </Popconfirm>
            )}
          </Flex>
        </Flex>
        {automation && <Typography.Text style={text.caption}>Changed by {automation.updatedBy}, {utc(automation.updatedAt)}</Typography.Text>}
      </Flex>
      <DestinationModal open={editing === 'destination'} project={project} current={automation} onCancel={() => setEditing(null)} onSaved={saved} />
      <SlackModal open={editing === 'slack'} project={project} onCancel={() => setEditing(null)} onSaved={saved} />
    </Card>
  )
}
