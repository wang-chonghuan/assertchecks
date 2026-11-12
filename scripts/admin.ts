// Operator CLI. Users, memberships, checks and error sources are managed only here; the web UI records
// decisions on production problems and where a project's automatic tickets go.
// People sign in with Clerk email codes; a user here is the email that grants access through memberships.
// Generated ping tokens are printed once and stored only as hashes.
import { parseArgs } from 'node:util'
import { readFileSync } from 'node:fs'
import { sql } from '../src/server/db'
import { hashToken, randomToken } from '../src/server/crypto'
import { fileAutomaticTickets, withRunLock } from '../src/server/auto-tickets'
import { failureEventKey, parseFailureEvent } from '../src/server/failure-events'

const USAGE = `usage: pnpm admin <command>
  user:add <email>                      allow an email; it sees the projects it is a member of
  project:add <slug> <name>             create a project
  member:add <email> <project-slug>     grant a user access to a project
  member:remove <email> <project-slug>  revoke a user's access to a project
  group:add <project-slug> <domain>     let everyone at an email domain view the project (read-only)
  group:remove <project-slug> <domain>  stop an email domain from viewing the project
  alerts:set <project-slug> [--contacts <file.json>] [--rotation <roles>] [--rotation-start <iso>]
            set BF alert config: Twilio from env (TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, TWILIO_API_SECRET,
            TWILIO_FROM), contacts from a JSON file; --rotation is the out-of-hours on-call order as a
            comma-separated list of roles (e.g. final,primary,backup) and --rotation-start the first handover
            instant (a Monday 09:00 Ireland, ISO, e.g. 2026-11-16T09:00:00Z). Only options given are changed.
  alerts:show <project-slug>            show the alert config (secrets masked)
  project:remove <slug> --confirm <slug>     delete a project with its checks, runs and memberships
  user:remove <email> --confirm <email>      delete a user with its memberships
  client:revoke <email>                 sign the user's AssertChecks clients out on every computer
  check:add <project-slug> <check-slug> --name <name> --env <env> --period <seconds|none> --grace <seconds>
            [--select-status active] [--select-run regular]
  check:update <project-slug> <check-slug> [--slug] [--name] [--env] [--period <seconds|none>] [--grace]
               [--select-status <a,b>] [--select-run <a,b>]
  A check without a period has no schedule and is never late. A full run must execute every catalog
  case whose status and run are in the selection (default: status active, run regular).
  check:token <project-slug> <check-slug>  replace a check's ping token
  source:set <project-slug> --workspace-id <customer-id> --workspace <resource-id> [--roles <a,b>]
             read the project's production errors from this Log Analytics workspace, optionally only
             these app roles; AssertChecks's identity needs Log Analytics Reader on it
  source:remove <project-slug>          stop reading the project's production errors
  source:events <project-slug> [<event>:<property>=<value> ...]
             count these custom events as failures, like exceptions (none: declare no events)
  errors:auto <project-slug> [--limit <n>] [--per-hour <n>]
             file the project's automatic tickets now, as the production timer does every 10 minutes;
             --limit files at most n, most frequent first; --per-hour lowers the hourly cap of 10 to
             try the overflow ticket on a test project (settings: the Production errors tab)
  list                                  show users, projects, memberships and checks`

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    name: { type: 'string' },
    env: { type: 'string' },
    period: { type: 'string' },
    grace: { type: 'string' },
    slug: { type: 'string' },
    'select-status': { type: 'string' },
    confirm: { type: 'string' },
    'select-run': { type: 'string' },
    'workspace-id': { type: 'string' },
    workspace: { type: 'string' },
    roles: { type: 'string' },
    limit: { type: 'string' },
    'per-hour': { type: 'string' },
    contacts: { type: 'string' },
    rotation: { type: 'string' },
    'rotation-start': { type: 'string' },
  },
})
const [command, ...args] = positionals
const db = sql()

function need(count: number): string[] {
  if (args.length !== count) throw new Error(USAGE)
  return args
}

function seconds(value: string | undefined, field: string): number | null {
  if (value === undefined) return null
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`--${field} must be a non-negative integer`)
  return parsed
}

// --period none clears the period; undefined leaves it unchanged.
function period(value: string | undefined): number | null | undefined {
  if (value === undefined) return undefined
  if (value === 'none') return null
  const parsed = seconds(value, 'period')
  if (!parsed) throw new Error('--period must be a positive number of seconds or none')
  return parsed
}

function list(value: string | undefined): string[] | undefined {
  if (value === undefined) return undefined
  const items = value.split(',').map((item) => item.trim()).filter(Boolean)
  if (!items.length) throw new Error('selection lists cannot be empty')
  return items
}

async function one<T>(rows: Promise<T[]>, missing: string): Promise<T> {
  const [row] = await rows
  if (!row) throw new Error(missing)
  return row
}

async function main(): Promise<void> {
  switch (command) {
    case 'user:add': {
      const [email] = need(1)
      await db`INSERT INTO users (email) VALUES (${email.toLowerCase()})`
      console.log(`created ${email.toLowerCase()}; it signs in with an email code`)
      return
    }
    case 'project:add': {
      const [slug, name] = need(2)
      await db`INSERT INTO projects (slug, name) VALUES (${slug}, ${name})`
      console.log(`created project ${slug}`)
      return
    }
    case 'member:add': {
      const [email, project] = need(2)
      await one(db`
        INSERT INTO memberships (user_id, project_id)
        SELECT u.id, p.id FROM users u, projects p WHERE u.email = ${email.toLowerCase()} AND p.slug = ${project}
        ON CONFLICT DO NOTHING RETURNING user_id
      `, 'unknown user or project, or membership already exists')
      console.log(`${email.toLowerCase()} can now see ${project}`)
      return
    }
    case 'member:remove': {
      const [email, project] = need(2)
      await one(db`
        DELETE FROM memberships m USING users u, projects p
        WHERE m.user_id = u.id AND m.project_id = p.id AND u.email = ${email.toLowerCase()} AND p.slug = ${project}
        RETURNING m.user_id
      `, 'membership not found')
      console.log(`${email.toLowerCase()} can no longer see ${project}`)
      return
    }
    // A domain group is a membership whose "user" is a bare domain (no @). Everyone signing in with that
    // email domain then gets read access through the normal membership check.
    case 'group:add': {
      const [project, domain] = need(2)
      const d = domain.replace(/^@/, '').toLowerCase()
      if (!d || d.includes('@')) throw new Error('give a bare email domain, e.g. example.com')
      await db`INSERT INTO users (email) VALUES (${d}) ON CONFLICT DO NOTHING`
      await one(db`
        INSERT INTO memberships (user_id, project_id)
        SELECT u.id, p.id FROM users u, projects p WHERE u.email = ${d} AND p.slug = ${project}
        ON CONFLICT DO NOTHING RETURNING user_id
      `, 'unknown project, or that domain already views it')
      console.log(`everyone at @${d} can now view ${project} (read-only)`)
      return
    }
    case 'group:remove': {
      const [project, domain] = need(2)
      const d = domain.replace(/^@/, '').toLowerCase()
      await one(db`
        DELETE FROM memberships m USING users u, projects p
        WHERE m.user_id = u.id AND m.project_id = p.id AND u.email = ${d} AND p.slug = ${project}
        RETURNING m.user_id
      `, 'that domain was not viewing that project')
      // Tidy up the domain's placeholder user once it grants nothing.
      await db`DELETE FROM users u WHERE u.email = ${d} AND NOT EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = u.id)`
      console.log(`@${d} can no longer view ${project}`)
      return
    }
    // BF alert config (ASSERT-56). Twilio credentials come from environment variables so they never reach
    // the shell history; contacts come from a JSON file. Only fields given are changed. Secrets live only in
    // the database, never logged.
    case 'alerts:set': {
      const [project] = need(1)
      const env = {
        account: process.env.TWILIO_ACCOUNT_SID ?? null,
        key: process.env.TWILIO_API_KEY_SID ?? null,
        secret: process.env.TWILIO_API_SECRET ?? null,
        from: process.env.TWILIO_FROM ?? null,
      }
      let contacts: unknown = undefined
      if (values.contacts) {
        contacts = JSON.parse(readFileSync(values.contacts, 'utf8'))
        if (!Array.isArray(contacts)) throw new Error('--contacts file must be a JSON array')
        for (const c of contacts as Record<string, unknown>[]) {
          if (c.role !== 'primary' && c.role !== 'backup' && c.role !== 'final') throw new Error('each contact needs role primary|backup|final')
        }
      }
      let rotation: string[] | undefined = undefined
      if (values.rotation !== undefined) {
        rotation = values.rotation.split(',').map((role) => role.trim()).filter(Boolean)
        for (const role of rotation) {
          if (role !== 'primary' && role !== 'backup' && role !== 'final') throw new Error('--rotation roles are primary|backup|final')
        }
      }
      let rotationStart: Date | undefined = undefined
      if (values['rotation-start'] !== undefined) {
        rotationStart = new Date(values['rotation-start'])
        if (Number.isNaN(rotationStart.getTime())) throw new Error('--rotation-start must be an ISO timestamp, e.g. 2026-11-16T09:00:00Z')
      }
      await one(db`
        INSERT INTO alert_config (project_id, twilio_account_sid, twilio_api_key_sid, twilio_api_secret, twilio_from, contacts, rotation, rotation_start, updated_by)
        SELECT p.id, ${env.account}, ${env.key}, ${env.secret}, ${env.from},
          ${contacts === undefined ? db`'[]'::jsonb` : db.json(contacts as never)},
          ${rotation === undefined ? db`'[]'::jsonb` : db.json(rotation as never)},
          ${rotationStart ?? null}, 'cli'
        FROM projects p WHERE p.slug = ${project}
        ON CONFLICT (project_id) DO UPDATE SET
          twilio_account_sid = COALESCE(EXCLUDED.twilio_account_sid, alert_config.twilio_account_sid),
          twilio_api_key_sid = COALESCE(EXCLUDED.twilio_api_key_sid, alert_config.twilio_api_key_sid),
          twilio_api_secret  = COALESCE(EXCLUDED.twilio_api_secret, alert_config.twilio_api_secret),
          twilio_from        = COALESCE(EXCLUDED.twilio_from, alert_config.twilio_from),
          contacts           = ${contacts === undefined ? db`alert_config.contacts` : db.json(contacts as never)},
          rotation           = ${rotation === undefined ? db`alert_config.rotation` : db.json(rotation as never)},
          rotation_start     = COALESCE(${rotationStart ?? null}, alert_config.rotation_start),
          updated_by = 'cli', updated_at = now()
        RETURNING project_id
      `, 'unknown project')
      console.log(`alert config saved for ${project}`)
      return
    }
    case 'alerts:show': {
      const [project] = need(1)
      const row = await one(db<{ account: string | null; key: string | null; secret: string | null; from: string | null; contacts: unknown; rotation: unknown; rotation_start: Date | null }[]>`
        SELECT a.twilio_account_sid AS account, a.twilio_api_key_sid AS key, a.twilio_api_secret AS secret, a.twilio_from AS from, a.contacts, a.rotation, a.rotation_start
        FROM alert_config a JOIN projects p ON p.id = a.project_id WHERE p.slug = ${project}
      `, 'no alert config for that project')
      const mask = (value: string | null) => value ? `set (…${value.slice(-4)})` : 'unset'
      console.log(`twilio account: ${mask(row.account)}`)
      console.log(`twilio api key: ${mask(row.key)}`)
      console.log(`twilio secret: ${row.secret ? 'set' : 'unset'}`)
      console.log(`twilio from: ${row.from ?? 'unset'}`)
      console.log(`out-of-hours rotation: ${Array.isArray(row.rotation) && row.rotation.length ? (row.rotation as string[]).join(' -> ') : 'unset'}`)
      console.log(`rotation start: ${row.rotation_start ? new Date(row.rotation_start).toISOString() : 'unset'}`)
      console.table(row.contacts)
      return
    }
    // Removal is for ticket-scoped test data; the repeated name guards against deleting the wrong object.
    case 'project:remove': {
      const [slug] = need(1)
      if (values.confirm !== slug) throw new Error(`refusing: repeat the project slug with --confirm ${slug}`)
      const [counts] = await db<{ checks: number; runs: number; members: number }[]>`
        SELECT (SELECT count(*)::int FROM checks c JOIN projects p ON p.id = c.project_id WHERE p.slug = ${slug}) AS checks,
               (SELECT count(*)::int FROM runs r JOIN checks c ON c.id = r.check_id JOIN projects p ON p.id = c.project_id WHERE p.slug = ${slug}) AS runs,
               (SELECT count(*)::int FROM memberships m JOIN projects p ON p.id = m.project_id WHERE p.slug = ${slug}) AS members
      `
      await one(db`DELETE FROM projects WHERE slug = ${slug} RETURNING id`, 'unknown project')
      console.log(`removed project ${slug} with ${counts.checks} check(s), ${counts.runs} run(s) and ${counts.members} membership(s)`)
      return
    }
    case 'user:remove': {
      const [email] = need(1)
      if (values.confirm?.toLowerCase() !== email.toLowerCase()) throw new Error(`refusing: repeat the email with --confirm ${email}`)
      await one(db`DELETE FROM users WHERE email = ${email.toLowerCase()} RETURNING id`, 'unknown user')
      console.log(`removed ${email.toLowerCase()} with its memberships`)
      return
    }
    case 'client:revoke': {
      const [email] = need(1)
      const rows = await db`
        DELETE FROM client_tokens WHERE user_id = (SELECT id FROM users WHERE email = ${email.toLowerCase()}) RETURNING id
      `
      console.log(`signed out ${rows.length} client sign-in(s) of ${email.toLowerCase()}`)
      return
    }
    case 'check:add': {
      const [project, slug] = need(2)
      const periodSeconds = period(values.period)
      const grace = seconds(values.grace, 'grace')
      if (!values.name || !values.env || periodSeconds === undefined || grace === null) throw new Error(USAGE)
      const selection = {
        status: list(values['select-status']) ?? ['active'],
        run: list(values['select-run']) ?? ['regular'],
      }
      const token = randomToken()
      await one(db`
        INSERT INTO checks (project_id, slug, name, environment, period_seconds, grace_seconds, selection, ping_token_hash)
        SELECT id, ${slug}, ${values.name}, ${values.env}, ${periodSeconds}, ${grace}, ${db.json(selection)}, ${hashToken(token)}
        FROM projects WHERE slug = ${project}
        RETURNING id
      `, 'unknown project')
      console.log(`created check ${project}/${slug}\nping token (shown once): ${token}`)
      return
    }
    case 'check:update': {
      const [project, slug] = need(2)
      const periodSeconds = period(values.period)
      const grace = seconds(values.grace, 'grace')
      const status = list(values['select-status'])
      const run = list(values['select-run'])
      await one(db`
        UPDATE checks c SET
          slug = coalesce(${values.slug ?? null}, c.slug),
          name = coalesce(${values.name ?? null}, c.name),
          environment = coalesce(${values.env ?? null}, c.environment),
          period_seconds = ${periodSeconds === undefined ? db`c.period_seconds` : periodSeconds},
          grace_seconds = coalesce(${grace}, c.grace_seconds),
          selection = jsonb_build_object(
            'status', coalesce(${status ? db.json(status) : null}::jsonb, c.selection -> 'status'),
            'run', coalesce(${run ? db.json(run) : null}::jsonb, c.selection -> 'run'))
        FROM projects p WHERE c.project_id = p.id AND p.slug = ${project} AND c.slug = ${slug}
        RETURNING c.id
      `, 'unknown check')
      console.log(`updated check ${project}/${values.slug ?? slug}`)
      return
    }
    case 'check:token': {
      const [project, slug] = need(2)
      const token = randomToken()
      await one(db`
        UPDATE checks c SET ping_token_hash = ${hashToken(token)}
        FROM projects p WHERE c.project_id = p.id AND p.slug = ${project} AND c.slug = ${slug}
        RETURNING c.id
      `, 'unknown check')
      console.log(`replaced token for ${project}/${slug}; the old token no longer works\nping token (shown once): ${token}`)
      return
    }
    case 'source:set': {
      const [project] = need(1)
      const workspaceId = values['workspace-id']
      const workspace = values.workspace
      if (!workspaceId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workspaceId)) {
        throw new Error('--workspace-id must be the workspace customer ID (az monitor log-analytics workspace show --query customerId)')
      }
      if (!workspace) throw new Error('--workspace must be the workspace resource ID')
      const roles = list(values.roles) ?? null
      if (roles?.some((role) => !/^[\w.-]+$/.test(role))) throw new Error('--roles are app role names')
      await one(db`
        INSERT INTO error_sources (project_id, workspace_id, workspace_path, roles)
        SELECT id, ${workspaceId}, ${workspace}, ${roles ? db.array(roles) : null}::text[] FROM projects WHERE slug = ${project}
        ON CONFLICT (project_id) DO UPDATE SET
          workspace_id = EXCLUDED.workspace_id, workspace_path = EXCLUDED.workspace_path, roles = EXCLUDED.roles
        RETURNING project_id
      `, 'unknown project')
      console.log(`${project} reads production errors from ${workspace}${roles ? ` (roles ${roles.join(', ')})` : ''}`)
      return
    }
    case 'source:remove': {
      const [project] = need(1)
      await one(db`
        DELETE FROM error_sources s USING projects p WHERE s.project_id = p.id AND p.slug = ${project} RETURNING s.project_id
      `, 'no error source for that project')
      console.log(`${project} no longer reads production errors`)
      return
    }
    case 'source:events': {
      const [project, ...specs] = args
      if (!project) throw new Error(USAGE)
      const declared = specs.map(parseFailureEvent)
      await one(db`
        UPDATE error_sources s SET failure_events = ${declared.length ? db.json(declared as never) : null}
        FROM projects p WHERE s.project_id = p.id AND p.slug = ${project} RETURNING s.project_id
      `, 'no error source for that project')
      console.log(declared.length
        ? `${project} counts these events as failures: ${declared.map(failureEventKey).join('; ')}`
        : `${project} declares no failure events`)
      return
    }
    case 'errors:auto': {
      const [project] = need(1)
      const { id } = await one(db<{ id: string }[]>`SELECT id FROM projects WHERE slug = ${project}`, 'no such project')
      const count = (value: string | undefined, flag: string) => {
        if (value === undefined) return undefined
        const parsed = Number(value)
        if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`--${flag} must be a positive integer`)
        return parsed
      }
      const options = { limit: count(values.limit, 'limit'), perHour: count(values['per-hour'], 'per-hour') }
      const result = await withRunLock(() => fileAutomaticTickets(id, options))
      if (!result) throw new Error('another run is filing tickets now; try again in a minute')
      if (result.skipped) console.log(`${project}: skipped (${result.skipped})`)
      for (const url of result.filed) console.log(`filed ${url}`)
      for (const failure of result.failed) console.log(`failed ${failure.problem}: ${failure.error}`)
      console.log(`${project}: ${result.filed.length} filed, ${result.grouped} on an overflow ticket, ${result.failed.length} failed`)
      return
    }
    case 'list': {
      need(0)
      console.table(await db`SELECT email, created_at FROM users ORDER BY email`)
      console.table(await db`SELECT slug, name FROM projects ORDER BY slug`)
      console.table(await db`
        SELECT u.email, p.slug AS project FROM memberships m
        JOIN users u ON u.id = m.user_id JOIN projects p ON p.id = m.project_id
        WHERE u.email LIKE '%@%' ORDER BY 1, 2
      `)
      console.table(await db`
        SELECT p.slug AS project, u.email AS domain FROM memberships m
        JOIN users u ON u.id = m.user_id JOIN projects p ON p.id = m.project_id
        WHERE u.email NOT LIKE '%@%' ORDER BY 1, 2
      `)
      console.table(await db`
        SELECT p.slug AS project, c.slug, c.name, c.environment, c.period_seconds, c.grace_seconds, c.selection::text
        FROM checks c JOIN projects p ON p.id = c.project_id ORDER BY 1, 2
      `)
      console.table(await db`
        SELECT p.slug AS project, s.workspace_path AS workspace, array_to_string(s.roles, ',') AS roles,
          s.failure_events::text AS failure_events
        FROM error_sources s JOIN projects p ON p.id = s.project_id ORDER BY 1
      `)
      return
    }
    default:
      throw new Error(USAGE)
  }
}

try {
  await main()
} catch (error) {
  console.error((error as Error).message)
  process.exitCode = 1
} finally {
  await db.end()
}
