// Reads a project's production errors from its own Log Analytics workspace (charter/engineering.md,
// read model). AssertChecks authenticates as its own Azure identity: the Container App's managed
// identity in production, the developer's `az login` locally. No key is stored anywhere.
//
// De-duplication happens in the queries:
// 1. One failure is one request (server records within a minute) or one page visit (browser records):
//    records of the same failure whose type names end the same are one failure, keeping the most
//    specific record; differently named errors in one request are separate failures.
// 2. Failures are grouped into problems by ProblemId.
// 3. Counts are failures, never raw records.
import { DefaultAzureCredential } from '@azure/identity'
import { LogsQueryClient, LogsQueryResultStatus, type LogsTable } from '@azure/monitor-query-logs'
import type { NoiseCategory } from '../lib/types'

export interface Source {
  workspaceId: string
  roles: string[] | null
}

// One problem's failures in a 5-minute bucket.
export interface FailureBucket { key: string; bucket: Date; count: number }
// One message template of a problem, with its latest record.
export interface ProblemVariantRow {
  key: string
  template: string
  count: number
  first: Date
  last: Date
  type: string | null
  message: string
  browser: boolean
  role: string | null
  place: string | null
  stack: string | null
}
export interface NoiseRow { category: NoiseCategory; item: string; count: number }
// An hour in which an operation was much slower than usual.
export interface SlowHour { operation: string; hour: Date; p95Ms: number; usualMs: number }

export interface Telemetry {
  buckets: FailureBucket[]
  variants: ProblemVariantRow[]
  noise: NoiseRow[]
  slow: SlowHour[]
}

// How far back problems are read (the workspaces keep 90 days), and how long a result is reused.
const LOOKBACK = 'P90D'
const CACHE_MS = 5 * 60 * 1000
// The stack shown for a problem's latest failure, trimmed so a page stays light.
const STACK_CHARS = 8000

// Request paths no real user sends: secret files, other stacks' admin pages, server internals.
const SCANNER = String.raw`(?i)(\.env|\.git|\.php|wp-|/proc/|cgi-bin|xmlrpc|\.aws|actuator|phpmyadmin|\.sql\b|\.bak\b)`
// Third-party analytics whose calls ad blockers routinely stop.
const ANALYTICS = ['google-analytics.com', 'googletagmanager.com', 'doubleclick.net', 'clarity.ms', 'segment.io',
  'mixpanel.com', 'amplitude.com', 'plausible.io', 'hotjar.com', 'posthog.com']
// The client went away mid-request; the type may sit in the outer type or only in the ProblemId.
const ABORTED = `(OuterType has_any ("ConnectionAbortedException", "ClientDisconnect") or ProblemId has_any ("ConnectionAbortedException", "ClientDisconnect")
    or (ClientType == "Browser" and OuterType has "AbortError"))`
// A slow hour: enough requests to matter, a p95 of at least a second and at least twice the usual.
const SLOW_MIN_REQUESTS = 10
const SLOW_MIN_P95_MS = 1000
const SLOW_FACTOR = 2

let client: LogsQueryClient | undefined
const logs = () => (client ??= new LogsQueryClient(new DefaultAzureCredential()))

// App roles come from the operator CLI; they are checked again before going into a query.
function roleFilter(roles: string[] | null): string {
  if (!roles) return ''
  if (!roles.every((role) => /^[\w.-]+$/.test(role))) throw new Error('invalid app role in the error source')
  return `| where AppRoleName in (dynamic(${JSON.stringify(roles)}))`
}

// Exceptions as failures, each marked with the noise category that keeps it out of the problems.
function failures(roles: string): string {
  return `
let since = ago(90d);
let clientErrors = AppRequests | where TimeGenerated > since ${roles} | where toint(ResultCode) between (400 .. 499) | distinct OperationId;
let failures = AppExceptions
| where TimeGenerated > since ${roles}
| extend op = iff(isempty(OperationId), _ItemId, OperationId)
| extend short = iff(ProblemId matches regex @"^[A-Za-z_][A-Za-z0-9_.]*$", extract(@"([A-Za-z0-9_]+)$", 1, ProblemId), ProblemId)
| extend noise = case(
    ClientType == "Browser" and OuterMessage has "Script error", "script",
    ${ABORTED}, "aborted",
    OperationId in (clientErrors), "client",
    "")
| extend unit = iff(ClientType == "Browser", strcat(op, "|", short), strcat(op, "|", short, "|", tostring(bin(TimeGenerated, 1m))))
| summarize arg_max(strlen(ProblemId), ProblemId, OuterType, OuterMessage, ClientType, AppRoleName, OperationName, op,
    stack = substring(tostring(Details[0].rawStack), 0, ${STACK_CHARS})), t = min(TimeGenerated), noise = max(noise) by unit
| where noise == "";`
}

function bucketsQuery(roles: string): string {
  return `${failures(roles)}
failures | summarize n = count() by ProblemId, bucket = bin(t, 5m)`
}

function variantsQuery(roles: string): string {
  return `${failures(roles)}
let places = AppRequests | where TimeGenerated > since ${roles} | where OperationId in ((failures | distinct op)) | summarize place = take_any(Name) by OperationId;
failures
| lookup kind=leftouter places on $left.op == $right.OperationId
| extend place = coalesce(place, OperationName)
| extend template = replace_regex(replace_regex(replace_regex(OuterMessage,
    @"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}", "<id>"), @"[0-9a-fA-F]{16,}", "<hex>"), @"\\d+", "<n>")
| summarize n = count(), firstAt = min(t), arg_max(t, OuterType, OuterMessage, ClientType, AppRoleName, place, stack) by ProblemId, template`
}

function noiseQuery(roles: string): string {
  return `
let since = ago(7d);
let scanner = @"${SCANNER}";
let requests = AppRequests | where TimeGenerated > since ${roles} | extend scan = Name matches regex scanner or Url matches regex scanner;
union
  (requests | where scan | summarize n = count() by category = "scanner", item = Name),
  (requests | where not(scan) and toint(ResultCode) between (400 .. 499) | summarize n = count() by category = "client", item = strcat(ResultCode, " ", Name)),
  (AppExceptions | where TimeGenerated > since ${roles}
    | extend category = case(ClientType == "Browser" and OuterMessage has "Script error", "script",
        ${ABORTED}, "aborted", "")
    | where category != ""
    | summarize n = dcount(iff(isempty(OperationId), _ItemId, OperationId)) by category, item = ProblemId),
  (AppDependencies | where TimeGenerated > since and Success == false ${roles}
    | where Target has_any (dynamic(${JSON.stringify(ANALYTICS)}))
    | summarize n = count() by category = "analytics", item = Target)`
}

function slowQuery(roles: string): string {
  return `
let requests = AppRequests | where TimeGenerated > ago(30d) ${roles};
let usual = requests | summarize usual = percentile(DurationMs, 95) by Name;
requests
| summarize p95 = percentile(DurationMs, 95), n = count() by Name, hour = bin(TimeGenerated, 1h)
| where n >= ${SLOW_MIN_REQUESTS} and p95 >= ${SLOW_MIN_P95_MS}
| lookup usual on Name
| where p95 >= ${SLOW_FACTOR} * usual`
}

type Row = Record<string, unknown>

function rows(table: LogsTable): Row[] {
  const names = table.columnDescriptors.map((column) => column.name ?? '')
  return table.rows.map((values) => Object.fromEntries(names.map((name, index) => [name, values[index]])))
}

// Azure nests the useful reason (a denied role, a query error) inside its errors; report the deepest.
interface AzureError { message?: string; details?: { error?: AzureError }; innererror?: AzureError }

function reason(error: unknown): string {
  let current = (error as AzureError).details?.error ?? (error as AzureError)
  while (current.innererror?.message) current = current.innererror
  return current.message ?? String(error)
}

async function run(workspaceId: string, query: string): Promise<Row[]> {
  const result = await logs().queryWorkspace(workspaceId, query, { duration: LOOKBACK }, { serverTimeoutInSeconds: 60 })
    .catch((error: unknown) => { throw new Error(reason(error)) })
  // A partial answer would undercount, so it is treated as no answer.
  if (result.status !== LogsQueryResultStatus.Success) {
    throw new Error(result.status === LogsQueryResultStatus.PartialFailure ? result.partialError.message : 'the query failed')
  }
  return rows(result.tables[0])
}

const text = (value: unknown): string | null => (typeof value === 'string' && value !== '' ? value : null)
const date = (value: unknown): Date => (value instanceof Date ? value : new Date(String(value)))
const num = (value: unknown): number => Number(value)

async function read(source: Source): Promise<Telemetry> {
  const roles = roleFilter(source.roles)
  const [buckets, variants, noise, slow] = await Promise.all([
    run(source.workspaceId, bucketsQuery(roles)),
    run(source.workspaceId, variantsQuery(roles)),
    run(source.workspaceId, noiseQuery(roles)),
    run(source.workspaceId, slowQuery(roles)),
  ])
  return {
    buckets: buckets.map((row) => ({ key: String(row.ProblemId), bucket: date(row.bucket), count: num(row.n) })),
    variants: variants.map((row) => ({
      key: String(row.ProblemId),
      template: String(row.template ?? ''),
      count: num(row.n),
      first: date(row.firstAt),
      last: date(row.t),
      type: text(row.OuterType),
      message: String(row.OuterMessage ?? ''),
      browser: row.ClientType === 'Browser',
      role: text(row.AppRoleName),
      place: text(row.place),
      stack: text(row.stack),
    })),
    noise: noise.map((row) => ({ category: row.category as NoiseCategory, item: String(row.item), count: num(row.n) })),
    slow: slow.map((row) => ({ operation: String(row.Name), hour: date(row.hour), p95Ms: num(row.p95), usualMs: num(row.usual) })),
  }
}

// One read per workspace per few minutes, however often the page is opened. A failed read is not kept.
const cache = new Map<string, { at: number; value: Promise<Telemetry> }>()

export function telemetry(source: Source, now = Date.now()): Promise<Telemetry> {
  const id = `${source.workspaceId}|${source.roles?.join(',') ?? ''}`
  const hit = cache.get(id)
  if (hit && now - hit.at < CACHE_MS) return hit.value
  const value = read(source)
  cache.set(id, { at: now, value })
  value.catch(() => cache.delete(id))
  return value
}
