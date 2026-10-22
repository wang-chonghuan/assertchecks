import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { App, Button, Flex, Result, Typography, theme } from 'antd'
import { approveClientLogin, getClientLogin } from '../../../server/fns'
import { utc } from '../../../components/status'

// Where a person approves the client's sign-in on their own computer (ASSERT-38). The code is the one
// the terminal printed; approving lets that client read and link tickets as this person.
export const Route = createFileRoute('/_app/cli/$code')({
  loader: ({ params }) => getClientLogin({ data: { code: params.code } }),
  component: ClientLoginPage,
})

function ClientLoginPage() {
  const login = Route.useLoaderData()
  const { me } = Route.useRouteContext()
  const { message } = App.useApp()
  const { token } = theme.useToken()
  const [state, setState] = useState(login.state)
  const [approving, setApproving] = useState(false)

  if (state === 'approved') {
    return <Result status="success" title="The client is signed in" subTitle="You can close this page and return to your terminal." />
  }
  if (state === 'expired') {
    return (
      <Result
        status="warning"
        title="This sign-in request expired"
        subTitle={<>Run <Typography.Text code>node assertchecks.mjs login</Typography.Text> again for a new code.</>}
      />
    )
  }
  return (
    <Result
      status="info"
      title="Sign in the AssertChecks client?"
      subTitle={(
        <>
          It will act as <Typography.Text strong>{me.email}</Typography.Text>: read your projects' failures and link
          tickets. Approve only if you just ran <Typography.Text code>node assertchecks.mjs login</Typography.Text> on
          your own computer and it shows this code.
        </>
      )}
      extra={(
        // The code first, so it is compared before anything is approved.
        <Flex vertical align="center" gap={token.marginSM}>
          <Typography.Title level={2} style={{ margin: 0 }}>{login.code}</Typography.Title>
          <Typography.Text type="secondary">Requested {utc(login.requestedAt)}</Typography.Text>
          <Button
            type="primary"
            loading={approving}
            onClick={async () => {
              setApproving(true)
              try {
                const { approved } = await approveClientLogin({ data: { code: login.code } })
                setState(approved ? 'approved' : 'expired')
              } catch {
                message.error('Approving failed. Reload the page and try again.')
              } finally {
                setApproving(false)
              }
            }}
          >
            Approve
          </Button>
        </Flex>
      )}
    />
  )
}
