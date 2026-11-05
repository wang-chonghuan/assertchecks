// The automatic reading of a production error written into its ticket (ASSERT-49). AssertChecks asks an
// Azure OpenAI deployment as its own Azure identity (the Container App's managed identity in production,
// the developer's `az login` locally); no key is stored. It sees only what the telemetry shows: the
// messages, the stack, where and how often. It never sees the project's code.
import { DefaultAzureCredential } from '@azure/identity'

const ENDPOINT = 'https://finley-codex.openai.azure.com/openai/v1/chat/completions'
const DEPLOYMENT = 'gpt-6.1-sol'
const SCOPE = 'https://cognitiveservices.azure.com/.default'
const TIMEOUT_MS = 90_000
const STACK_CHARS = 6000

export type Language = 'en' | 'zh'

export interface ErrorFacts {
  key: string
  type: string | null
  message: string
  place: string | null
  source: string
  firstSeen: string
  lastSeen: string
  count24h: number
  count7d: number
  count90d: number
  variants: { template: string; count: number }[]
  stack: string | null
}

let credential: DefaultAzureCredential | undefined

const INSTRUCTIONS: Record<Language, string> = {
  en: `You help the developer who has to fix a production error. You see only its telemetry, never the code.
Write three short parts with these exact headings: "What happens", "Likely cause", "Where to look".
Base every statement on the telemetry given; when it does not settle something, say so instead of guessing.
Name files, functions and lines only when the stack shows them. At most 180 words. Plain text, no tables.`,
  zh: `你帮助要修复一个生产报错的开发。你只看得到它的遥测，看不到代码。
用这三个小标题写三段简短的话：“发生了什么”“可能的原因”“从哪里查起”。
每句话都以给出的遥测为依据；遥测确定不了的，直接说确定不了，不要猜。
只有堆栈里出现的文件、函数和行号才可以点名。不超过 300 字。纯文本，不用表格。`,
}

// The telemetry as the model reads it; long stacks are cut so a request stays small.
export function factsText(facts: ErrorFacts): string {
  return [
    `Problem: ${facts.key}`,
    `Latest error: ${facts.type ? `${facts.type}: ` : ''}${facts.message}`,
    `Where: ${facts.place ?? 'not recorded'} (${facts.source})`,
    `First seen ${facts.firstSeen}, last seen ${facts.lastSeen}`,
    `Failures: ${facts.count24h} in 24 hours, ${facts.count7d} in 7 days, ${facts.count90d} in 90 days`,
    facts.variants.length ? `Message variants:\n${facts.variants.map((variant) => `- ${variant.count}× ${variant.template}`).join('\n')}` : '',
    facts.stack ? `Latest stack:\n${facts.stack.slice(0, STACK_CHARS)}` : 'No stack recorded.',
  ].filter(Boolean).join('\n')
}

export async function interpret(facts: ErrorFacts, language: Language): Promise<string> {
  credential ??= new DefaultAzureCredential()
  const token = await credential.getToken(SCOPE)
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { authorization: `Bearer ${token.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: DEPLOYMENT,
      messages: [
        { role: 'system', content: INSTRUCTIONS[language] },
        { role: 'user', content: factsText(facts) },
      ],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const reply = await response.json().catch(() => ({})) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } }
  if (!response.ok) throw new Error(`Azure OpenAI: HTTP ${response.status} ${reply.error?.message ?? ''}`.trim())
  const text = reply.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('Azure OpenAI returned no text')
  return text
}
