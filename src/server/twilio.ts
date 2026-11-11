// Twilio outbound call for BF escalation (ASSERT-56). A short ring on a responsible person's phone; it
// carries no voice, no recording and no paid answering-machine detection. We authenticate with an API Key
// (SID + secret) as HTTP Basic, with the Account SID in the URL, per Twilio's REST API. Credentials live
// only in the database (alert_config); nothing is logged. We only ever dial a number from the configured
// contacts, never an arbitrary one.
const TIMEOUT_MS = 20_000
// How long Twilio lets the phone ring before giving up, in seconds (the Call resource's `Timeout`).
const RING_SECONDS = 12
// Answered calls hang up at once: no message, no recording.
const HANGUP_TWIML = '<Response><Hangup/></Response>'

export interface TwilioConfig {
  accountSid: string | null
  apiKeySid: string | null
  apiSecret: string | null
  from: string | null
}

export const twilioReady = (config: TwilioConfig): boolean =>
  Boolean(config.accountSid && config.apiKeySid && config.apiSecret && config.from)

// Places the short ring to `to` and returns the Twilio call SID. Throws when the config is incomplete, the
// number is not one of the allowed configured numbers, or Twilio refuses. The caller records the outcome and
// does not blindly retry when it cannot tell whether the call was placed.
export async function placeCall(config: TwilioConfig, to: string, allowed: string[]): Promise<string> {
  if (!twilioReady(config)) throw new Error('Twilio is not configured')
  if (!allowed.includes(to)) throw new Error('refusing to call a number that is not a configured contact')
  const auth = Buffer.from(`${config.apiKeySid}:${config.apiSecret}`).toString('base64')
  const body = new URLSearchParams({
    To: to,
    From: config.from!,
    Timeout: String(RING_SECONDS),
    Twiml: HANGUP_TWIML,
  })
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.accountSid!)}/Calls.json`, {
    method: 'POST',
    headers: { authorization: `Basic ${auth}`, 'content-type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const reply = await response.json().catch(() => ({})) as { sid?: string; message?: string; code?: number }
  if (!response.ok || !reply.sid) {
    throw new Error(`Twilio: HTTP ${response.status}${reply.code ? ` [${reply.code}]` : ''} ${reply.message ?? ''}`.trim())
  }
  return reply.sid
}
