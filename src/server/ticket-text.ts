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

// One Slack message for one ticket put on one or more problems.
export function slackText(input: {
  project: string
  ticket: string
  problems: { problem: ProblemView; link: string }[]
  automatic: boolean
  by: string
}): string {
  const head = input.automatic
    ? `New ticket for a production error in *${escapeSlack(input.project)}*: ${input.ticket}`
    : `${escapeSlack(input.by)} put a ticket on a production error in *${escapeSlack(input.project)}*: ${input.ticket}`
  const items = input.problems.map(({ problem, link }) =>
    `• <${link}|${escapeSlack(clip(latestLine(problem), 150))}>\n   ${escapeSlack(problem.place ?? 'place not recorded')} · ${problem.count7d} in 7 days · first seen ${utc(problem.firstSeen)}`)
  return [head, ...items].join('\n')
}
