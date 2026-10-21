// Operator CLI. Users, memberships and checks are managed only here; the web UI is read-only.
// People sign in with Clerk email codes; a user here is the email that grants access through memberships.
// Generated ping tokens are printed once and stored only as hashes.
import { parseArgs } from 'node:util'
import { sql } from '../src/server/db'
import { hashToken, randomToken } from '../src/server/crypto'

const USAGE = `usage: pnpm admin <command>
  user:add <email>                      allow an email; it sees the projects it is a member of
  project:add <slug> <name>             create a project
  member:add <email> <project-slug>     grant a user access to a project
  member:remove <email> <project-slug>  revoke a user's access to a project
  project:remove <slug> --confirm <slug>     delete a project with its checks, runs and memberships
  user:remove <email> --confirm <email>      delete a user with its memberships
  check:add <project-slug> <check-slug> --name <name> --env <env> --period <seconds|none> --grace <seconds>
            [--select-status active] [--select-run regular]
  check:update <project-slug> <check-slug> [--slug] [--name] [--env] [--period <seconds|none>] [--grace]
               [--select-status <a,b>] [--select-run <a,b>]
  A check without a period has no schedule and is never late. A full run must execute every catalog
  case whose status and run are in the selection (default: status active, run regular).
  check:token <project-slug> <check-slug>  replace a check's ping token
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
    case 'list': {
      need(0)
      console.table(await db`SELECT email, created_at FROM users ORDER BY email`)
      console.table(await db`SELECT slug, name FROM projects ORDER BY slug`)
      console.table(await db`
        SELECT u.email, p.slug AS project FROM memberships m
        JOIN users u ON u.id = m.user_id JOIN projects p ON p.id = m.project_id ORDER BY 1, 2
      `)
      console.table(await db`
        SELECT p.slug AS project, c.slug, c.name, c.environment, c.period_seconds, c.grace_seconds, c.selection::text
        FROM checks c JOIN projects p ON p.id = c.project_id ORDER BY 1, 2
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
