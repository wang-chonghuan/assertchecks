// The ticket platforms automatic tickets go to (ASSERT-49): Plane and Linear, through their public APIs
// with the access key a project member connected. Nothing here touches the database.
export type Platform = 'plane' | 'linear'

export interface Access { platform: Platform; token: string; workspace: string | null }
// Where tickets go: a Plane project, or a Linear team or a project within one of its teams (teamId is the
// team). A Linear project shared by several teams is listed once per team, since an issue has one team.
export interface Target { id: string; name: string; teamId: string | null }
export interface Person { id: string; name: string }
export interface Ticket { title: string; markdown: string; html: string }

const TIMEOUT_MS = 20_000
const PLANE_API = 'https://api.plane.so/api/v1'
const PLANE_APP = 'https://app.plane.so'
const LINEAR_API = 'https://api.linear.app/graphql'

// The platform's own reason when it gives one, so a person can fix the key or the choice.
async function failure(response: Response, what: string): Promise<Error> {
  const body = await response.text().catch(() => '')
  let detail = body.slice(0, 200)
  try {
    const parsed = JSON.parse(body) as { detail?: string; error?: string; errors?: { message?: string }[] }
    detail = parsed.detail ?? parsed.error ?? parsed.errors?.[0]?.message ?? detail
  } catch { /* not JSON */ }
  const reason = response.status === 401 || response.status === 403 ? 'the access key was refused' : `HTTP ${response.status}`
  return new Error(`${what}: ${reason}${detail ? ` (${detail})` : ''}`)
}

async function plane<T>(access: Access, path: string, init?: { method: string; body: unknown }): Promise<T> {
  const response = await fetch(`${PLANE_API}/${path}`, {
    method: init?.method ?? 'GET',
    headers: { 'x-api-key': access.token, ...(init ? { 'content-type': 'application/json' } : {}) },
    body: init ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) throw await failure(response, 'Plane')
  return response.json() as Promise<T>
}

async function linear<T>(access: Access, query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(LINEAR_API, {
    method: 'POST',
    headers: { authorization: access.token, 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) throw await failure(response, 'Linear')
  const reply = await response.json() as { data?: T; errors?: { message: string }[] }
  if (reply.errors?.length || !reply.data) throw new Error(`Linear: ${reply.errors?.[0]?.message ?? 'no data'}`)
  return reply.data
}

const workspace = (access: Access) => {
  if (!access.workspace) throw new Error('Plane needs the workspace slug')
  return encodeURIComponent(access.workspace)
}

// Plane lists are either a bare array or a page with results.
const listOf = <T>(reply: T[] | { results: T[] }): T[] => (Array.isArray(reply) ? reply : reply.results)

// Who the key belongs to, which also proves the key and, for Plane, the workspace.
export async function verify(access: Access): Promise<string> {
  if (access.platform === 'plane') {
    const me = await plane<{ display_name: string; email: string }>(access, 'users/me/')
    await plane(access, `workspaces/${workspace(access)}/projects/?per_page=1`)
    return me.email || me.display_name
  }
  const data = await linear<{ viewer: { name: string; email: string } }>(access, 'query { viewer { name email } }')
  return data.viewer.email || data.viewer.name
}

export async function targets(access: Access): Promise<Target[]> {
  if (access.platform === 'plane') {
    const reply = await plane<{ results: { id: string; name: string; identifier: string; archived_at: string | null }[] }>(
      access, `workspaces/${workspace(access)}/projects/?per_page=100`)
    return reply.results.filter((project) => !project.archived_at)
      .map((project) => ({ id: project.id, name: `${project.name} (${project.identifier})`, teamId: null }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }
  const data = await linear<{
    teams: { nodes: { id: string; name: string; key: string }[] }
    projects: { nodes: { id: string; name: string; teams: { nodes: { id: string; key: string }[] } }[] }
  }>(access, `query {
    teams(first: 50) { nodes { id name key } }
    projects(first: 100, filter: { state: { nin: ["completed", "canceled"] } }) { nodes { id name teams(first: 10) { nodes { id key } } } }
  }`)
  const teams = data.teams.nodes.map((team) => ({ id: team.id, name: `${team.name} (${team.key})`, teamId: team.id }))
    .sort((a, b) => a.name.localeCompare(b.name))
  const projects = data.projects.nodes.flatMap((project) => project.teams.nodes
    .map((team) => ({ id: project.id, name: `${project.name} (${team.key} project)`, teamId: team.id })))
    .sort((a, b) => a.name.localeCompare(b.name))
  return [...teams, ...projects]
}

// The people a ticket at this target can be assigned to.
export async function people(access: Access, target: { id: string; teamId: string | null }): Promise<Person[]> {
  if (access.platform === 'plane') {
    const reply = await plane<{ id: string; display_name: string; first_name: string; last_name: string; email: string; is_active?: boolean; is_bot?: boolean }[] | { results: never[] }>(
      access, `workspaces/${workspace(access)}/projects/${encodeURIComponent(target.id)}/members/`)
    return listOf(reply).filter((member) => member.is_active !== false && !member.is_bot)
      .map((member) => ({ id: member.id, name: [`${member.first_name} ${member.last_name}`.trim() || member.display_name, member.email].filter(Boolean).join(' · ') }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }
  if (!target.teamId) throw new Error('Linear tickets need a team')
  const data = await linear<{ team: { members: { nodes: { id: string; name: string; email: string; active: boolean }[] } } }>(
    access, 'query ($id: String!) { team(id: $id) { members(first: 250) { nodes { id name email active } } } }', { id: target.teamId })
  return data.team.members.nodes.filter((member) => member.active)
    .map((member) => ({ id: member.id, name: [member.name, member.email].filter(Boolean).join(' · ') }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// Every automatic ticket carries this label, so a team can find them all with one filter (ASSERT-54).
export const LABEL = 'production-error'

// The label to use among those with that name: the team's own first, then a workspace-wide one.
export function pickLabel(labels: { id: string; name: string; teamId: string | null }[], teamId: string | null): string | null {
  const named = labels.filter((label) => label.name.toLowerCase() === LABEL)
  return (named.find((label) => teamId !== null && label.teamId === teamId) ?? named.find((label) => label.teamId === null))?.id ?? null
}

// The label's id at the target, created there when it does not exist yet.
async function labelId(access: Access, at: { targetId: string; teamId: string | null }): Promise<string> {
  if (access.platform === 'plane') {
    const path = `workspaces/${workspace(access)}/projects/${encodeURIComponent(at.targetId)}/labels/`
    const labels = listOf(await plane<{ id: string; name: string }[] | { results: { id: string; name: string }[] }>(access, path))
    return pickLabel(labels.map((label) => ({ ...label, teamId: null })), null)
      ?? (await plane<{ id: string }>(access, path, { method: 'POST', body: { name: LABEL } })).id
  }
  const data = await linear<{ issueLabels: { nodes: { id: string; name: string; team: { id: string } | null }[] } }>(access,
    'query ($name: String!) { issueLabels(first: 50, filter: { name: { eqIgnoreCase: $name } }) { nodes { id name team { id } } } }', { name: LABEL })
  const found = pickLabel(data.issueLabels.nodes.map((label) => ({ id: label.id, name: label.name, teamId: label.team?.id ?? null })), at.teamId)
  if (found) return found
  const made = await linear<{ issueLabelCreate: { success: boolean; issueLabel: { id: string } | null } }>(access, `
    mutation ($input: IssueLabelCreateInput!) { issueLabelCreate(input: $input) { success issueLabel { id } } }`,
  { input: { name: LABEL, teamId: at.teamId } })
  if (!made.issueLabelCreate.success || !made.issueLabelCreate.issueLabel) throw new Error(`Linear did not create the ${LABEL} label`)
  return made.issueLabelCreate.issueLabel.id
}

// Files one ticket, labelled, and returns its address.
export async function createTicket(
  access: Access, at: { targetId: string; teamId: string | null; assigneeId: string | null }, ticket: Ticket,
): Promise<string> {
  if (access.platform === 'plane') {
    const base = `workspaces/${workspace(access)}/projects/${encodeURIComponent(at.targetId)}`
    const project = await plane<{ identifier: string }>(access, `${base}/`)
    const label = await labelId(access, at)
    const issue = await plane<{ sequence_id: number }>(access, `${base}/work-items/`, {
      method: 'POST',
      body: { name: ticket.title, description_html: ticket.html, labels: [label], ...(at.assigneeId ? { assignees: [at.assigneeId] } : {}) },
    })
    return `${PLANE_APP}/${workspace(access)}/browse/${project.identifier}-${issue.sequence_id}/`
  }
  if (!at.teamId) throw new Error('Linear tickets need a team')
  const label = await labelId(access, at)
  const data = await linear<{ issueCreate: { success: boolean; issue: { url: string } | null } }>(access, `
    mutation ($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { url } } }`, {
    input: {
      teamId: at.teamId,
      ...(at.targetId !== at.teamId ? { projectId: at.targetId } : {}),
      ...(at.assigneeId ? { assigneeId: at.assigneeId } : {}),
      title: ticket.title,
      description: ticket.markdown,
      labelIds: [label],
    },
  })
  if (!data.issueCreate.success || !data.issueCreate.issue) throw new Error('Linear did not create the ticket')
  return data.issueCreate.issue.url
}
