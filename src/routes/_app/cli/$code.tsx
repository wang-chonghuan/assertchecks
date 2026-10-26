import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { App, Button, Flex, Result, Typography } from 'antd'
import { KeyOutlined } from '@ant-design/icons'
import { approveClientLogin, getClientLogin } from '../../../server/fns'
import { utc } from '../../../components/status'
import { space, text } from '../../../infui/tokens'

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
  const [state, setState] = useState(login.state)
  const [approving, setApproving] = useState(false)

  if (state === 'approved') {
    return <Result status="success" title="This computer is signed in" subTitle="You can close this page and go back to your terminal or coding agent." />
  }
  if (state === 'expired') {
    return (
      <Result
        status="warning"
        title="This sign-in request expired"
        subTitle="Sign in again from your terminal or coding agent for a new code."
      />
    )
  }
  return (
    <Result
      status="info"
      icon={<KeyOutlined />}
      title="Approve this computer?"
      subTitle={(
        <>
          A sign-in started on your computer, by you or your coding agent, will act as{' '}
          <Typography.Text style={text.label}>{me.email}</Typography.Text>: read your projects' failures and link tickets. Approve
          only if it shows this same code.
        </>
      )}
      extra={(
        // The code first, so it is compared before anything is approved.
        <Flex vertical align="center" gap={space.stack}>
          <Typography.Title level={2} style={{ ...text.heading1, margin: 0 }}>{login.code}</Typography.Title>
          <Typography.Text style={text.caption}>Requested {utc(login.requestedAt)}</Typography.Text>
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
