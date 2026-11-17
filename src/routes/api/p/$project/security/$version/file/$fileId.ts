import { createFileRoute } from '@tanstack/react-router'
import { securityReportFile } from '../../../../../../../server/queries'
import { currentUser } from '../../../../../../../server/session'

// Login-gated download of a real test report file (ASSERT-71). Same access as the pages: a signed-in
// viewer who can see the project gets the bytes; anyone else gets 401/404. The file is never public.
export const Route = createFileRoute('/api/p/$project/security/$version/file/$fileId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const user = await currentUser()
        if (!user) return new Response('Sign in required.', { status: 401 })
        const file = await securityReportFile(user, params.project, params.version, params.fileId)
        if (!file) return new Response('Not found.', { status: 404 })
        const safeName = file.filename.replace(/[^A-Za-z0-9._-]/g, '_')
        const body = new Uint8Array(file.bytes)
        return new Response(body, {
          status: 200,
          headers: {
            'content-type': file.contentType,
            'content-disposition': `attachment; filename="${safeName}"`,
            'content-length': String(body.length),
            'cache-control': 'private, no-store',
          },
        })
      },
    },
  },
})
