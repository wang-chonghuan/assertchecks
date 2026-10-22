import { createFileRoute } from '@tanstack/react-router'
import { publicOrigin, requirePerson } from '../../../server/client-tokens'
import { bugReport, me, overview } from '../../../server/queries'
import { recentBugReport } from '../../../lib/bug-report'

// A check's failure report for the signed-in person, the same text as "Copy bugs from recent runs".
// Without a project it lists the person's projects; without a check, the project's checks.
export const Route = createFileRoute('/api/cli/bugs')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const person = await requirePerson(request)
        if (person instanceof Response) return person
        const query = new URL(request.url).searchParams
        const project = query.get('project')
        const check = query.get('check')
        if (!project) return Response.json({ projects: (await me(person, null)).projects })
        if (!check) {
          const view = await overview(person.id, project)
          if (!view) return Response.json({ error: 'not found' }, { status: 404 })
          return Response.json({ checks: view.checks.map(({ slug, name, environment }) => ({ slug, name, environment })) })
        }
        const report = await bugReport(person.id, project, check)
        if (!report) return Response.json({ error: 'not found' }, { status: 404 })
        return new Response(recentBugReport(publicOrigin(request), report), { headers: { 'content-type': 'text/plain; charset=utf-8' } })
      },
    },
  },
})
