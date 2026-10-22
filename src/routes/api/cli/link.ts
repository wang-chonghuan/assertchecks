import { createFileRoute } from '@tanstack/react-router'
import { requirePerson } from '../../../server/client-tokens'
import { readBody } from '../../../server/ingest'
import { caseIds, linkFromClient, ticketUrl } from '../../../server/ticket-links'

// The signed-in person records that a ticket covers cases of one of their projects.
export const Route = createFileRoute('/api/cli/link')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const person = await requirePerson(request)
        if (person instanceof Response) return person
        const body = await readBody(request)
        if (!('text' in body)) return Response.json(body.body, { status: body.status })
        let fields: { project: string; cases: string[]; url: string }
        try {
          const data = JSON.parse(body.text || '{}') as { project?: unknown; cases?: unknown; ticket?: unknown }
          if (typeof data.project !== 'string' || !data.project) throw new Error('project is required')
          fields = { project: data.project, cases: caseIds(data.cases), url: ticketUrl(data.ticket) }
        } catch (error) {
          return Response.json({ error: (error as Error).message }, { status: 400 })
        }
        const reply = await linkFromClient(person, fields.project, fields.cases, fields.url)
        if (!reply) return Response.json({ error: 'not found' }, { status: 404 })
        if ('unknown' in reply) return Response.json({ error: `not in the project's current catalogs: ${reply.unknown.join(', ')}` }, { status: 400 })
        return Response.json(reply)
      },
    },
  },
})
