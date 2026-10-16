import { createFileRoute } from '@tanstack/react-router'
import { readBody, startRun } from '../../../../server/ingest'

export const Route = createFileRoute('/api/ping/$token/start')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const body = await readBody(request)
        const reply = 'text' in body ? await startRun(params.token, body.text) : body
        return Response.json(reply.body, { status: reply.status })
      },
    },
  },
})
