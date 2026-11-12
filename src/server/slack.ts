// Slack incoming webhooks (ASSERT-49): a project's channel receives the tickets put on its production
// errors. The webhook address is the only thing AssertChecks keeps; it identifies one channel.
const TIMEOUT_MS = 15_000

export function webhookUrl(value: unknown): string {
  if (typeof value !== 'string') throw new Error('the Slack webhook must be a URL')
  const url = value.trim()
  if (!/^https:\/\/hooks\.slack\.com\/[\w/-]+$/.test(url) || url.length > 256) {
    throw new Error('the Slack webhook must be an https://hooks.slack.com/… address')
  }
  return url
}

// What a person sees of a saved webhook: enough to recognise it, not enough to post with it.
export const webhookHint = (url: string) => `hooks.slack.com/…${url.slice(-4)}`

// Posts a message in Slack's mrkdwn; throws Slack's reason when it refuses.
export async function postToSlack(webhook: string, text: string): Promise<void> {
  const response = await fetch(webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, unfurl_links: true }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) {
    const reason = (await response.text().catch(() => '')).slice(0, 100)
    throw new Error(`Slack refused the message: HTTP ${response.status}${reason ? ` ${reason}` : ''}`)
  }
}

// Slack mrkdwn treats these three as markup.
export const escapeSlack = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// An @mention of a Slack member by id, e.g. "<@U08SA7K8J9X>" (ASSERT-56). A missing id falls back to the
// plain name so a notice is never silently un-addressed.
export const slackMention = (memberId: string | null | undefined, name: string) =>
  memberId && /^[UW][A-Z0-9]{2,}$/.test(memberId) ? `<@${memberId}>` : escapeSlack(name)
