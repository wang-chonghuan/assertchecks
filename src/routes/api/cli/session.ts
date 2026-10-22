import { createFileRoute } from '@tanstack/react-router'
import { approvalUrl, endSession, LOGIN_MINUTES, requirePerson, startLogin } from '../../../server/client-tokens'
import { readBody } from '../../../server/ingest'

// The client's sign-in as a person: start one (POST), say who it is (GET), sign out (DELETE).
export const Route = createFileRoute('/api/cli/session')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await readBody(request)
        if (!('text' in body)) return Response.json(body.body, { status: body.status })
        let code: string
        try {
          code = await startLogin((JSON.parse(body.text || '{}') as { tokenHash?: unknown }).tokenHash)
        } catch (error) {
          return Response.json({ error: (error as Error).message }, { status: 400 })
        }
        return Response.json({ code, url: approvalUrl(request, code), minutes: LOGIN_MINUTES })
      },
      GET: async ({ request }) => {
        const person = await requirePerson(request)
        return person instanceof Response ? person : Response.json({ email: person.email })
      },
      DELETE: async ({ request }) => {
        await endSession(request)
        return Response.json({ ok: true })
      },
    },
  },
})
