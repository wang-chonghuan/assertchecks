import { createFileRoute } from '@tanstack/react-router'
import { readBody, reportRun } from '../../../../server/ingest'

export const Route = createFileRoute('/api/ping/$token/report')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const body = await readBody(request)
        const reply = 'text' in body ? await reportRun(params.token, body.text) : body
        return Response.json(reply.body, { status: reply.status })
      },
    },
  },
})
