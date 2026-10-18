import { createFileRoute } from '@tanstack/react-router'
import { checkReport, readBody } from '../../../../server/ingest'

export const Route = createFileRoute('/api/ping/$token/check')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const body = await readBody(request)
        const reply = 'text' in body ? await checkReport(params.token, body.text) : body
        return Response.json(reply.body, { status: reply.status })
      },
    },
  },
})
