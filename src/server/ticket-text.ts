// The words of an automatic ticket and of a Slack message about a ticket (ASSERT-49). Pure, so every rule
// is unit-tested. Tickets read in the platform's language: Linear English, Plane Chinese.
import type { ProblemView } from '../lib/types'
import { escapeSlack } from './slack'
import type { Language } from './interpret'

const TITLE_CHARS = 120
const STACK_CHARS = 4000

export const problemLink = (origin: string, project: string, problemId: string) =>
  `${origin}/p/${encodeURIComponent(project)}?tab=errors&problem=${problemId}`

const one = (value: string) => value.replace(/\s+/g, ' ').trim()
const clip = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1)}…` : value)

// The latest error in one line. Browser messages often start with their type already; it is not repeated.
function latestLine(problem: ProblemView): string {
  if (!problem.latest) return problem.key
  const { type, message } = problem.latest
  const prefix = type && !message.startsWith(type) ? `${type}: ` : ''
  return one(`${prefix}${message}`) || problem.key
}

const source = (problem: ProblemView) => (problem.browser ? 'Browser' : (problem.role ?? 'server'))

// One block of a ticket: a heading and either lines of text or a code block.
interface Block { heading: string; lines?: string[]; code?: string }

const WORDS = {
  en: {
    colon: ': ',
    title: 'Production error',
    failed: 'What failed',
    error: 'Latest error',
    where: 'Where',
    seen: 'Seen',
    failures: 'Failures',
    variants: 'Message variants',
    reading: 'Automatic interpretation',
    readingNote: 'Written by AssertChecks from the telemetry only (messages, stack, place and counts), without the code; not a confirmed cause.',
    stack: 'Latest stack',
    open: 'In AssertChecks',
    surgeTitle: (count: number) => `Production error surge: ${count} problems in an hour`,
    surgeNote: (perHour: number) => `More than ${perHour} problems needed a ticket within an hour, so these share one ticket; they may have one cause, so start with what changed last, such as the latest deploy. Problems that appear later this hour are added to this ticket in AssertChecks. Split it into separate tickets where they turn out to be unrelated.`,
    surgeProblems: 'Problems',
    seenText: (first: string, last: string) => `first ${first}, last ${last}`,
    failuresText: (p: ProblemView) => `${p.count24h} in 24 hours, ${p.count7d} in 7 days, ${p.count90d} in 90 days`,
    notRecorded: 'not recorded',
  },
  zh: {
    colon: '：',
    title: '生产报错',
    failed: '报错内容',
    error: '最近一次错误',
    where: '位置',
    seen: '出现时间',
    failures: '次数',
    variants: '消息变体',
    reading: '自动解读',
    readingNote: '由 AssertChecks 仅根据遥测（消息、堆栈、位置和次数）写出，没有看代码，不是已确认的原因。',
    stack: '最近一次堆栈',
    open: 'AssertChecks 链接',
    surgeTitle: (count: number) => `生产报错激增：1 小时内 ${count} 个问题`,
    surgeNote: (perHour: number) => `1 小时内需要开单的问题超过 ${perHour} 个，这些问题共用这一张工单；它们可能出自同一个原因，先查最近的改动，例如最近一次部署。这一小时内之后出现的问题会在 AssertChecks 上挂到这张工单。查明互不相关的，再拆成单独的工单。`,
    surgeProblems: '问题',
    seenText: (first: string, last: string) => `首次 ${first}，最近 ${last}`,
    failuresText: (p: ProblemView) => `24 小时 ${p.count24h} 次，7 天 ${p.count7d} 次，90 天 ${p.count90d} 次`,
    notRecorded: '未记录',
  },
}

const utc = (iso: string) => `${iso.slice(0, 16).replace('T', ' ')} UTC`

export function ticketText(input: {
  language: Language
  problem: ProblemView
  // The automatic interpretation; a ticket is never filed without one.
  reading: string
  link: string
}): { title: string; markdown: string; html: string } {
  const { problem, link } = input
  const w = WORDS[input.language]
  const c = w.colon
  const blocks: Block[] = [
    {
      heading: w.failed,
      lines: [
        `${w.error}${c}${latestLine(problem)}`,
        `${w.where}${c}${problem.place ?? w.notRecorded} (${source(problem)})`,
        `${w.seen}${c}${w.seenText(utc(problem.firstSeen), utc(problem.lastSeen))}`,
        `${w.failures}${c}${w.failuresText(problem)}`,
      ],
    },
    ...(problem.variants.length > 1
      ? [{ heading: w.variants, lines: problem.variants.map((variant) => `${variant.count}× ${one(variant.template)}`) }]
      : []),
    {
      heading: w.reading,
      lines: [w.readingNote, ...input.reading.split('\n').filter((line) => line.trim())],
    },
    ...(problem.latest?.stack ? [{ heading: w.stack, code: clip(problem.latest.stack, STACK_CHARS) }] : []),
    { heading: w.open, lines: [link] },
  ]
  const title = clip(`${w.title}${c}${latestLine(problem)}`, TITLE_CHARS)
  return { title, markdown: toMarkdown(blocks), html: toHtml(blocks) }
}

// The overflow ticket: the problems of one hour beyond the per-hour limit, each with where, how often and
// its AssertChecks link. No interpretation: a surge is read as a whole, starting from what changed.
export function overflowText(input: {
  language: Language
  perHour: number
  problems: { problem: ProblemView; link: string }[]
}): { title: string; markdown: string; html: string } {
  const w = WORDS[input.language]
  const c = w.colon
  const blocks: Block[] = [
    { heading: w.failed, lines: [w.surgeNote(input.perHour)] },
    {
      heading: w.surgeProblems,
      lines: input.problems.flatMap(({ problem, link }) => [
        `${latestLine(problem)} | ${w.where}${c}${problem.place ?? w.notRecorded} (${source(problem)}) | ${w.failures}${c}${w.failuresText(problem)}`,
        link,
      ]),
    },
  ]
  return { title: clip(w.surgeTitle(input.problems.length), TITLE_CHARS), markdown: toMarkdown(blocks), html: toHtml(blocks) }
}

function toMarkdown(blocks: Block[]): string {
  return blocks.map((block) => {
    const body = block.code !== undefined
      ? `\`\`\`\n${block.code.replace(/```/g, "'''")}\n\`\`\``
      : (block.lines ?? []).join('\n\n')
    return `## ${block.heading}\n\n${body}`
  }).join('\n\n')
}

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function toHtml(blocks: Block[]): string {
  const line = (text: string) => (/^https?:\/\/\S+$/.test(text)
    ? `<p><a href="${escapeHtml(text)}">${escapeHtml(text)}</a></p>`
    : `<p>${escapeHtml(text)}</p>`)
  return blocks.map((block) => `<h2>${escapeHtml(block.heading)}</h2>${block.code !== undefined
    ? `<pre><code>${escapeHtml(block.code)}</code></pre>`
    : (block.lines ?? []).map(line).join('')}`).join('')
}

// A Slack message lists at most this many problems; an overflow ticket says how many more it has.
const SLACK_ITEMS = 10

// One Slack message for one ticket put on one or more problems; `surge` marks an overflow ticket.
export function slackText(input: {
  project: string
  ticket: string
  problems: { problem: ProblemView; link: string }[]
  automatic: boolean
  by: string
  surge?: boolean
}): string {
  const head = input.surge
    ? `Production error surge in *${escapeSlack(input.project)}*: ${input.problems.length} problems within an hour share one ticket: ${input.ticket}`
    : input.automatic
    ? `New ticket for a production error in *${escapeSlack(input.project)}*: ${input.ticket}`
    : `${escapeSlack(input.by)} put a ticket on a production error in *${escapeSlack(input.project)}*: ${input.ticket}`
  const items = input.problems.slice(0, SLACK_ITEMS).map(({ problem, link }) =>
    `• <${link}|${escapeSlack(clip(latestLine(problem), 150))}>\n   ${escapeSlack(problem.place ?? 'place not recorded')} · ${problem.count7d} in 7 days · first seen ${utc(problem.firstSeen)}`)
  const more = input.problems.length - SLACK_ITEMS
  return [head, ...items, ...(more > 0 ? [`…and ${more} more`] : [])].join('\n')
}
