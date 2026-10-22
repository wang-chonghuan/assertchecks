// Pure assembly of the production-errors view from what the telemetry says and what people decided.
// Nothing here reads the database or Azure, so every rule is unit-tested.
import type { NoiseRow, ProblemVariantRow, SlowHour, Telemetry } from './telemetry'
import type { NoiseCategory, ProblemGroup, ProblemIgnored, ProblemKind, ProblemView, ProductionErrors, TicketLink } from '../lib/types'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
// A problem not seen for this long leaves the working lists for "Quiet for 30+ days".
const QUIET_DAYS = 30
// How far back the telemetry reaches for each kind (errors: the workspace's 90 days; slow hours: 30).
const LOOKBACK_DAYS: Record<ProblemKind, number> = { error: 90, slow: 30 }
// Problems shown as appearing together: first seen within this window, or sharing half their hours.
const TOGETHER_FIRST_MS = HOUR
const TOGETHER_SHARE = 0.5
const DAILY_DAYS = 30
const VARIANTS = 5
const NOISE_ITEMS = 10

// A stored problem: what was first and last seen, whether it is marked Not handling, and its tickets.
export interface StoredProblem {
  id: string
  kind: ProblemKind
  key: string
  firstSeen: Date
  lastSeen: Date
  ignored: ProblemIgnored | null
  // Newest first.
  tickets: TicketLink[]
}

export interface Seen { kind: ProblemKind; key: string; firstSeen: Date; lastSeen: Date }

const problemId = (kind: ProblemKind, key: string) => `${kind}\u0000${key}`

// First and last occurrence of every problem the telemetry shows, to merge into the stored problems.
export function seenProblems(data: Telemetry): Seen[] {
  const seen = new Map<string, Seen>()
  const add = (kind: ProblemKind, key: string, first: Date, last: Date) => {
    const id = problemId(kind, key)
    const known = seen.get(id)
    if (!known) seen.set(id, { kind, key, firstSeen: first, lastSeen: last })
    else {
      if (first < known.firstSeen) known.firstSeen = first
      if (last > known.lastSeen) known.lastSeen = last
    }
  }
  for (const row of data.variants) add('error', row.key, row.first, row.last)
  for (const row of data.slow) add('slow', row.operation, row.hour, new Date(row.hour.getTime() + HOUR))
  return [...seen.values()]
}

// Failures of each problem over time: 5-minute buckets for errors, one per slow hour.
function occurrences(data: Telemetry): Map<string, { at: number; count: number }[]> {
  const byProblem = new Map<string, { at: number; count: number }[]>()
  const push = (id: string, at: number, count: number) => {
    const list = byProblem.get(id) ?? []
    list.push({ at, count })
    byProblem.set(id, list)
  }
  for (const row of data.buckets) push(problemId('error', row.key), row.bucket.getTime(), row.count)
  for (const row of data.slow) push(problemId('slow', row.operation), row.hour.getTime(), 1)
  return byProblem
}

const sum = (list: { at: number; count: number }[], from: number, to = Infinity) =>
  list.reduce((total, item) => (item.at >= from && item.at < to ? total + item.count : total), 0)

function groupOf(problem: StoredProblem, now: number): ProblemGroup {
  if (problem.ignored) return 'ignored'
  if (now - problem.lastSeen.getTime() > QUIET_DAYS * DAY) return 'quiet'
  return problem.tickets.length ? 'ticket' : 'triage'
}

// Which problems appeared together: first seen within an hour of each other, or active in mostly the
// same hours. Problems marked Not handling are left out so they do not crowd the hints.
export function together(
  problems: { id: string; key: string; firstSeen: number; hours: Set<number> }[],
): Map<string, string[]> {
  const result = new Map<string, string[]>()
  for (const a of problems) {
    const others: string[] = []
    for (const b of problems) {
      if (a === b) continue
      const shared = [...a.hours].filter((hour) => b.hours.has(hour)).length
      const union = new Set([...a.hours, ...b.hours]).size
      if (Math.abs(a.firstSeen - b.firstSeen) <= TOGETHER_FIRST_MS || (union > 0 && shared / union >= TOGETHER_SHARE)) {
        others.push(b.key)
      }
    }
    result.set(a.id, others)
  }
  return result
}

function noiseSummary(rows: NoiseRow[]): ProductionErrors['noise'] {
  const order: NoiseCategory[] = ['client', 'scanner', 'aborted', 'analytics', 'script']
  return order.map((category) => {
    const items = rows.filter((row) => row.category === category).sort((a, b) => b.count - a.count)
    return {
      category,
      total: items.reduce((total, row) => total + row.count, 0),
      items: items.slice(0, NOISE_ITEMS).map((row) => ({ item: row.item, count: row.count })),
    }
  })
}

function latestVariant(variants: ProblemVariantRow[]): ProblemVariantRow | undefined {
  return variants.reduce<ProblemVariantRow | undefined>((latest, row) => (!latest || row.last > latest.last ? row : latest), undefined)
}

function latestSlow(hours: SlowHour[]): SlowHour | undefined {
  return hours.reduce<SlowHour | undefined>((latest, row) => (!latest || row.hour > latest.hour ? row : latest), undefined)
}

const ORDER: Record<ProblemGroup, number> = { triage: 0, ticket: 1, quiet: 2, ignored: 3 }

function compare(a: ProblemView, b: ProblemView): number {
  if (a.group !== b.group) return ORDER[a.group] - ORDER[b.group]
  if (a.group === 'triage' && a.isNew !== b.isNew) return a.isNew ? -1 : 1
  if (a.group === 'ticket') {
    const aStill = (a.sinceTicket?.count ?? 0) > 0
    const bStill = (b.sinceTicket?.count ?? 0) > 0
    if (aStill !== bStill) return aStill ? -1 : 1
    // Problems sharing their newest ticket stay next to each other.
    const byTicket = (a.tickets[0]?.url ?? '').localeCompare(b.tickets[0]?.url ?? '')
    if (byTicket !== 0) return byTicket
  }
  if (a.group !== 'quiet' && a.count7d !== b.count7d) return b.count7d - a.count7d
  if (a.group !== 'quiet' && a.count90d !== b.count90d) return b.count90d - a.count90d
  return b.lastSeen.localeCompare(a.lastSeen)
}

export function assemble(input: {
  project: { slug: string; name: string }
  stored: StoredProblem[]
  data: Telemetry
  now: Date
  portalUrl: string | null
}): ProductionErrors {
  const { stored, data } = input
  const now = input.now.getTime()
  const byProblem = occurrences(data)
  const variantsOf = new Map<string, ProblemVariantRow[]>()
  for (const row of data.variants) variantsOf.set(row.key, [...(variantsOf.get(row.key) ?? []), row])
  const slowOf = new Map<string, SlowHour[]>()
  for (const row of data.slow) slowOf.set(row.operation, [...(slowOf.get(row.operation) ?? []), row])

  // A stored problem the telemetry still covers but no longer counts was reclassified as noise; it is
  // dropped unless someone already decided on it.
  const current = stored.filter((problem) => problem.ignored !== null || problem.tickets.length > 0 || byProblem.has(problemId(problem.kind, problem.key))
    || now - problem.lastSeen.getTime() > LOOKBACK_DAYS[problem.kind] * DAY)

  const hints = together(current.filter((problem) => !problem.ignored).map((problem) => ({
    id: problem.id,
    key: problem.key,
    firstSeen: problem.firstSeen.getTime(),
    hours: new Set((byProblem.get(problemId(problem.kind, problem.key)) ?? []).map((item) => Math.floor(item.at / HOUR))),
  })))

  const problems = current.map((problem): ProblemView => {
    const list = byProblem.get(problemId(problem.kind, problem.key)) ?? []
    const group = groupOf(problem, now)
    // "Since the ticket" counts from the newest ticket.
    const ticketAt = problem.tickets[0] ? new Date(problem.tickets[0].at).getTime() : undefined
    const since = ticketAt !== undefined ? sum(list, ticketAt) : 0
    const variants = problem.kind === 'error' ? (variantsOf.get(problem.key) ?? []) : []
    const latest = latestVariant(variants)
    const slow = problem.kind === 'slow' ? latestSlow(slowOf.get(problem.key) ?? []) : undefined
    return {
      id: problem.id,
      kind: problem.kind,
      key: problem.key,
      group,
      isNew: now - problem.firstSeen.getTime() <= DAY,
      firstSeen: problem.firstSeen.toISOString(),
      lastSeen: problem.lastSeen.toISOString(),
      count24h: sum(list, now - DAY),
      count7d: sum(list, now - 7 * DAY),
      count90d: sum(list, 0),
      ignored: problem.ignored,
      tickets: problem.tickets,
      sinceTicket: ticketAt !== undefined
        ? {
            count: since,
            quietDays: since > 0 ? null : Math.floor((now - Math.max(ticketAt, problem.lastSeen.getTime())) / DAY),
          }
        : null,
      together: hints.get(problem.id) ?? [],
      place: latest?.place ?? null,
      role: latest?.role ?? null,
      browser: latest?.browser ?? false,
      variants: [...variants].sort((a, b) => b.count - a.count || b.last.getTime() - a.last.getTime())
        .slice(0, VARIANTS).map((row) => ({ template: row.template, count: row.count, lastAt: row.last.toISOString() })),
      latest: latest ? { at: latest.last.toISOString(), type: latest.type, message: latest.message, stack: latest.stack } : null,
      slow: slow ? { p95Ms: Math.round(slow.p95Ms), usualMs: Math.round(slow.usualMs) } : null,
    }
  }).sort(compare)

  // Failures of errors that are not marked Not handling; slow hours are not failures.
  const counted = new Set(current.filter((problem) => problem.kind === 'error' && !problem.ignored)
    .map((problem) => problemId(problem.kind, problem.key)))
  const failures = data.buckets.filter((row) => counted.has(problemId('error', row.key)))
  const today = Math.floor(now / DAY) * DAY
  const daily = Array.from({ length: DAILY_DAYS }, (_, index) => {
    const start = today - (DAILY_DAYS - 1 - index) * DAY
    return {
      day: new Date(start).toISOString().slice(0, 10),
      count: failures.reduce((total, row) => (row.bucket.getTime() >= start && row.bucket.getTime() < start + DAY ? total + row.count : total), 0),
    }
  })
  const window = (from: number, to: number) =>
    failures.reduce((total, row) => (row.bucket.getTime() >= from && row.bucket.getTime() < to ? total + row.count : total), 0)

  return {
    project: input.project,
    state: 'ready',
    error: null,
    checkedAt: input.now.toISOString(),
    portalUrl: input.portalUrl,
    headline: {
      triage: problems.filter((problem) => problem.group === 'triage').length,
      isNew: problems.filter((problem) => problem.group === 'triage' && problem.isNew).length,
      ticket: problems.filter((problem) => problem.group === 'ticket').length,
      stillOccurring: problems.filter((problem) => problem.group === 'ticket' && (problem.sinceTicket?.count ?? 0) > 0).length,
      last24h: window(now - DAY, Infinity),
      previous24h: window(now - 2 * DAY, now - DAY),
    },
    daily,
    problems,
    noise: noiseSummary(data.noise),
  }
}

// What the tab shows when there is no source, or when the telemetry could not be read.
export function withoutData(
  project: { slug: string; name: string }, state: 'not-connected' | 'unavailable', now: Date, error: string | null, portalUrl: string | null,
): ProductionErrors {
  return {
    project,
    state,
    error,
    checkedAt: now.toISOString(),
    portalUrl,
    headline: { triage: 0, isNew: 0, ticket: 0, stillOccurring: 0, last24h: 0, previous24h: 0 },
    daily: [],
    problems: [],
    noise: [],
  }
}
