import { clerkMiddleware } from '@clerk/tanstack-react-start/server'
import { createCsrfMiddleware, createStart } from '@tanstack/react-start'

// With this file present TanStack Start no longer adds its default CSRF protection, so it is added here
// for server functions. Clerk's middleware makes the signed-in user available to auth().
export const startInstance = createStart(() => ({
  requestMiddleware: [
    createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === 'serverFn' }),
    clerkMiddleware(),
  ],
}))
