import { createFileRoute } from '@tanstack/react-router'
import { linkCases, readBody } from '../../../../server/ingest'

export const Route = createFileRoute('/api/ping/$token/link')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const body = await readBody(request)
        const reply = 'text' in body ? await linkCases(params.token, body.text) : body
        return Response.json(reply.body, { status: reply.status })
      },
    },
  },
})
