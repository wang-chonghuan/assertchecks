import { createFileRoute } from '@tanstack/react-router'
import { checkFormat, readBody } from '../../server/ingest'

// The dry run without a check: is this catalog (and result) in the published format? Needs no token
// and records nothing.
export const Route = createFileRoute('/api/check')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await readBody(request)
        const reply = 'text' in body ? checkFormat(body.text) : body
        return Response.json(reply.body, { status: reply.status })
      },
    },
  },
})
