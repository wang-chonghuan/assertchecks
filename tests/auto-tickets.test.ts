import assert from 'node:assert/strict'
import { test } from 'node:test'
import { overflowText, problemLink, slackText, ticketText } from '../src/server/ticket-text'
import { webhookHint, webhookUrl } from '../src/server/slack'
import { factsText } from '../src/server/interpret'
import type { ProblemView } from '../src/lib/types'

const problem = (extra: Partial<ProblemView> = {}): ProblemView => ({
  id: '42', kind: 'error', key: 'System.InvalidOperationException at Orders.Submit', group: 'triage', isNew: false,
  firstSeen: '2026-11-01T08:30:00.000Z', lastSeen: '2026-11-05T09:15:00.000Z',
  count24h: 3, count7d: 12, count90d: 40, ignored: null, tickets: [], sinceTicket: null, together: [],
  place: 'POST /api/orders', role: 'api', browser: false,
  variants: [{ template: 'Order <n> has no lines', count: 10, lastAt: '2026-11-05T09:15:00.000Z' }],
  latest: { at: '2026-11-05T09:15:00.000Z', type: 'InvalidOperationException', message: 'Order 981 has no lines', stack: 'at Orders.Submit (orders.ts:88)' },
  slow: null, needsTicket: true, auto: null,
  ...extra,
})

const LINK = 'https://assertchecks.com/p/shop?tab=errors&problem=42'

test('a problem link opens the Production errors tab at that problem', () => {
  assert.equal(problemLink('https://assertchecks.com', 'shop', '42'), LINK)
})

test('a Linear ticket is English: the error, where, when, how often, the interpretation marked as automatic, the stack and the link', () => {
  const ticket = ticketText({ language: 'en', problem: problem(), reading: 'What happens\nAn order without lines is submitted.', link: LINK })
  assert.equal(ticket.title, 'Production error: InvalidOperationException: Order 981 has no lines')
  for (const part of [
    'Latest error: InvalidOperationException: Order 981 has no lines',
    'Where: POST /api/orders (api)',
    'Seen: first 2026-11-01 08:30 UTC, last 2026-11-05 09:15 UTC',
    'Failures: 3 in 24 hours, 12 in 7 days, 40 in 90 days',
    '## Automatic interpretation',
    'not a confirmed cause',
    'An order without lines is submitted.',
    '```\nat Orders.Submit (orders.ts:88)\n```',
    LINK,
  ]) assert.ok(ticket.markdown.includes(part), part)
})

test('a Plane ticket is Chinese HTML with every value escaped and the link clickable', () => {
  const ticket = ticketText({
    language: 'zh',
    problem: problem({ latest: { at: '2026-11-05T09:15:00.000Z', type: null, message: '<script>alert(1)</script>', stack: null } }),
    reading: '发生了什么',
    link: LINK,
  })
  assert.equal(ticket.title, '生产报错：<script>alert(1)</script>')
  assert.ok(ticket.html.includes('<h2>自动解读</h2>'))
  assert.ok(ticket.html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'))
  assert.ok(!ticket.html.includes('<script>'))
  assert.ok(ticket.html.includes(`<a href="${LINK.replace(/&/g, '&amp;')}">`))
  assert.ok(!ticket.html.includes('<h2>最近一次堆栈</h2>'), 'no stack, no stack section')
})

test('a message that already starts with its type does not repeat the type', () => {
  const browser = problem({ latest: { at: '2026-11-05T09:15:00.000Z', type: 'RangeError', message: 'RangeError: Maximum call stack size exceeded.', stack: null } })
  const ticket = ticketText({ language: 'en', problem: browser, reading: 'r', link: LINK })
  assert.equal(ticket.title, 'Production error: RangeError: Maximum call stack size exceeded.')
  assert.ok(ticket.markdown.includes('Latest error: RangeError: Maximum call stack size exceeded.\n'))
})

test('a long message makes a title of at most 120 characters, on one line', () => {
  const long = problem({ latest: { at: '2026-11-05T09:15:00.000Z', type: 'Error', message: `line one\n${'x'.repeat(300)}`, stack: null } })
  const { title } = ticketText({ language: 'en', problem: long, reading: 'r', link: LINK })
  assert.equal(title.length, 120)
  assert.ok(!title.includes('\n'))
  assert.ok(title.endsWith('…'))
})

test('a code fence inside the stack cannot close the stack block early', () => {
  const fenced = problem({ latest: { at: '2026-11-05T09:15:00.000Z', type: 'Error', message: 'm', stack: 'a\n```\nb' } })
  const { markdown } = ticketText({ language: 'en', problem: fenced, reading: 'r', link: LINK })
  assert.equal(markdown.match(/```/g)?.length, 2)
})

test('a Slack message names the ticket and each problem with a link back, escaping Slack markup', () => {
  const message = slackText({
    project: 'Shop & Co', ticket: 'https://linear.app/x/issue/ENG-1', automatic: true, by: 'AssertChecks (automatic)',
    problems: [{ problem: problem({ place: '<GET /a>' }), link: LINK }],
  })
  assert.equal(message, [
    'New ticket for a production error in *Shop &amp; Co*: https://linear.app/x/issue/ENG-1',
    `• <${LINK}|InvalidOperationException: Order 981 has no lines>`,
    '   &lt;GET /a&gt; · 12 in 7 days · first seen 2026-11-01 08:30 UTC',
  ].join('\n'))
  assert.ok(slackText({ project: 'Shop', ticket: 'https://t', automatic: false, by: 'ana@example.com', problems: [] })
    .startsWith('ana@example.com put a ticket on a production error in *Shop*'))
})

test('only Slack incoming webhook addresses are accepted, and a saved one is shown only by its end', () => {
  assert.equal(webhookUrl(' https://hooks.slack.com/services/T1/B2/abcd '), 'https://hooks.slack.com/services/T1/B2/abcd')
  for (const bad of ['http://hooks.slack.com/services/T1', 'https://hooks.slack.com.evil.com/x', 'https://example.com/hook', 42]) {
    assert.throws(() => webhookUrl(bad), /hooks\.slack\.com|URL/)
  }
  assert.equal(webhookHint('https://hooks.slack.com/services/T1/B2/abcd'), 'hooks.slack.com/…abcd')
})

test('the model reads the telemetry facts with the stack cut short', () => {
  const textOf = factsText({
    key: 'K', type: 'TypeError', message: 'x is undefined', place: null, source: 'browser',
    firstSeen: 'f', lastSeen: 'l', count24h: 1, count7d: 2, count90d: 3, variants: [], stack: 's'.repeat(10_000),
  })
  assert.ok(textOf.includes('Latest error: TypeError: x is undefined'))
  assert.ok(textOf.includes('Where: not recorded (browser)'))
  assert.ok(textOf.length < 6_500)
})

test('an overflow ticket lists every problem of the hour with its link, and says why they share one ticket', () => {
  const problems = [problem(), problem({ id: '43', latest: { at: '2026-11-05T09:15:00.000Z', type: 'TypeError', message: 'x is undefined', stack: null }, browser: true, place: '/' })]
    .map((item) => ({ problem: item, link: problemLink('https://assertchecks.com', 'shop', item.id) }))
  const en = overflowText({ language: 'en', perHour: 10, problems })
  assert.equal(en.title, 'Production error surge: 2 problems in an hour')
  assert.ok(en.markdown.includes('More than 10 problems needed a ticket within an hour'))
  assert.ok(en.markdown.includes('TypeError: x is undefined | Where: / (Browser) | Failures: 3 in 24 hours, 12 in 7 days, 40 in 90 days'))
  assert.ok(en.markdown.includes('https://assertchecks.com/p/shop?tab=errors&problem=43'))
  const zh = overflowText({ language: 'zh', perHour: 10, problems })
  assert.equal(zh.title, '生产报错激增：1 小时内 2 个问题')
  assert.ok(zh.html.includes('<h2>问题</h2>'))
})

test('a surge message names the shared ticket and lists at most ten problems', () => {
  const many = Array.from({ length: 12 }, (_, index) => ({ problem: problem({ id: String(index) }), link: `${LINK}${index}` }))
  const message = slackText({ project: 'Shop', ticket: 'https://t/1', automatic: true, by: 'AssertChecks (automatic)', problems: many, surge: true })
  const lines = message.split('\n')
  assert.equal(lines[0], 'Production error surge in *Shop*: 12 problems within an hour share one ticket: https://t/1')
  assert.equal(lines.filter((line) => line.startsWith('• ')).length, 10)
  assert.equal(lines.at(-1), '…and 2 more')
})
