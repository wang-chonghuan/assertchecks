import { useClerk } from '@clerk/tanstack-react-start'
import { Outlet, createFileRoute, redirect, useNavigate, useParams } from '@tanstack/react-router'
import { Button, Flex, Grid, Layout, Select, Typography, theme } from 'antd'
import { HomeOutlined, LogoutOutlined } from '@ant-design/icons'
import { getMe } from '../server/fns'
import { Brand, PRODUCT_NAME } from '../components/brand'
import { pageFrame } from '../components/page-frame'

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
  const { signOut } = useClerk()
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { project?: string }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Header
        style={{
          paddingInline: 0,
          borderBottom: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
        }}
      >
        <Flex align="center" gap={token.marginSM} style={{ ...pageFrame, height: '100%' }}>
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
            <Button icon={<LogoutOutlined />} onClick={() => signOut()} aria-label={`Sign out ${me.email}`} title={me.email} />
          </Flex>
        </Flex>
      </Layout.Header>
      <Layout.Content style={{ ...pageFrame, paddingBlock: token.padding }}>
        <Outlet />
      </Layout.Content>
    </Layout>
  )
}
