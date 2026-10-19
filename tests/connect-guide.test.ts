import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CASES_FORMAT, CONNECT_STEPS, FORMAT_CALLS, FORMAT_LINKS, FORMAT_SAMPLES, ORIGIN, PASS_RULE, agentPrompt } from '../src/lib/connect-guide'

// The homepage renders the guide and "Copy for your agent" copies agentPrompt(); both must carry the
// same content, derived from the guide rather than from a second list.
test('the agent prompt carries every step, code sample, format link and call of the guide', () => {
  const prompt = agentPrompt()
  const samples = [...CONNECT_STEPS.flatMap((step) => step.samples), ...FORMAT_SAMPLES, CASES_FORMAT]
  assert.ok(samples.length > 0)
  for (const [index, step] of CONNECT_STEPS.entries()) assert.ok(prompt.includes(`### ${index + 1}. ${step.title}`), step.title)
  for (const step of CONNECT_STEPS) assert.ok(prompt.includes(step.text), step.title)
  for (const sample of samples) assert.ok(prompt.includes(sample.code), sample.label)
  for (const link of FORMAT_LINKS) assert.ok(prompt.includes(`${ORIGIN}${link.path}`), link.label)
  for (const call of FORMAT_CALLS) assert.ok(prompt.includes(`/api/ping/<token>/${call.method}\``), call.method)
  assert.ok(prompt.includes(PASS_RULE))
})
