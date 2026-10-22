import { SignIn } from '@clerk/tanstack-react-start'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Flex, Typography, theme } from 'antd'
import { getMe } from '../server/fns'
import { Brand } from '../components/brand'
import { pageGutter } from '../components/page-frame'

// Only a path on this site, so the sign-in page cannot send anyone elsewhere.
const samePath = (value: unknown) => typeof value === 'string' && /^\/(?![/\\])/.test(value) ? value : undefined

export const Route = createFileRoute('/login')({
  validateSearch: (search: { redirect?: unknown }): { redirect?: string } => ({ redirect: samePath(search.redirect) }),
  beforeLoad: async ({ search }) => {
    if (await getMe()) throw redirect({ href: search.redirect ?? '/p' })
  },
  component: LoginPage,
})

// Clerk signs people in with an email code or Google; what they can see is set by the operator CLI.
function LoginPage() {
  const { token } = theme.useToken()
  const after = Route.useSearch().redirect ?? '/p'
  return (
    <Flex vertical justify="center" align="center" gap={token.marginLG} style={{ minHeight: '100vh', paddingInline: pageGutter, background: token.colorBgLayout }}>
      <a href="/" aria-label="AssertChecks home"><Brand size="large" /></a>
      <Typography.Text type="secondary">Sign in to see your projects' checks.</Typography.Text>
      <SignIn routing="hash" withSignUp fallbackRedirectUrl={after} signUpFallbackRedirectUrl={after} />
    </Flex>
  )
}
