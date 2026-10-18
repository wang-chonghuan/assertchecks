import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { Alert, Button, Card, Flex, Form, Input, Typography, theme } from 'antd'
import { useState } from 'react'
import { getMe, login } from '../server/fns'
import { Brand } from '../components/brand'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    if (await getMe()) throw redirect({ to: '/p' })
  },
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const { token } = theme.useToken()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const submit = async (values: { email: string; password: string }) => {
    setPending(true)
    setError(null)
    try {
      const result = await login({ data: values })
      if (!result.ok) {
        setError('Email or password is incorrect.')
        return
      }
      await router.invalidate()
      await router.navigate({ to: '/p' })
    } catch {
      setError('Sign-in failed. Try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Flex justify="center" align="center" style={{ minHeight: '100vh', padding: token.padding }}>
      <Card style={{ width: '100%', maxWidth: token.screenXS }}>
        <Typography.Title level={3}><Brand /></Typography.Title>
        <Typography.Paragraph type="secondary">Sign in to see your projects' checks.</Typography.Paragraph>
        {error && <Alert type="error" showIcon title={error} style={{ marginBottom: token.margin }} />}
        <Form layout="vertical" onFinish={submit} requiredMark={false}>
          <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}>
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item label="Password" name="password" rules={[{ required: true }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={pending}>
            Sign in
          </Button>
        </Form>
      </Card>
    </Flex>
  )
}
