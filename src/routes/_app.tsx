import { Outlet, createFileRoute, redirect, useNavigate, useParams, useRouter } from '@tanstack/react-router'
import { Button, Flex, Grid, Layout, Select, Typography, theme } from 'antd'
import { HomeOutlined, LogoutOutlined } from '@ant-design/icons'
import { getMe, logout } from '../server/fns'
import { Brand, PRODUCT_NAME } from '../components/brand'

export const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    const me = await getMe()
    if (!me) throw redirect({ to: '/login' })
    return { me }
  },
  component: AppLayout,
})

function AppLayout() {
  const { me } = Route.useRouteContext()
  const { token } = theme.useToken()
  const screens = Grid.useBreakpoint()
  const router = useRouter()
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { project?: string }

  const signOut = async () => {
    await logout()
    await router.invalidate()
    await navigate({ to: '/login' })
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: token.marginSM,
          paddingInline: token.padding,
          background: token.colorBgContainer,
          borderBottom: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
        }}
      >
        <a href="/" aria-label={`${PRODUCT_NAME} home`}><Brand /></a>
        {me.projects.length > 0 && (
          <Select
            aria-label="Project"
            value={params.project}
            placeholder="Project"
            style={{ minWidth: token.controlHeight * 3, maxWidth: '50%' }}
            options={me.projects.map((project) => ({ value: project.slug, label: project.name }))}
            onChange={(project) => navigate({ to: '/p/$project', params: { project } })}
          />
        )}
        <Flex flex={1} justify="end" align="center" gap={token.marginXS}>
          <Button icon={<HomeOutlined />} href="/" aria-label="Home" title="Home">{screens.md && 'Home'}</Button>
          {screens.md && (
            <Typography.Text type="secondary" ellipsis style={{ maxWidth: token.screenXS / 2 }}>
              {me.email}
            </Typography.Text>
          )}
          <Button icon={<LogoutOutlined />} onClick={signOut} aria-label={`Sign out ${me.email}`} title={me.email} />
        </Flex>
      </Layout.Header>
      <Layout.Content style={{ padding: token.padding, width: '100%', maxWidth: token.screenXL, marginInline: 'auto' }}>
        <Outlet />
      </Layout.Content>
    </Layout>
  )
}
