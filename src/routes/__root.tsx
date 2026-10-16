import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { App, ConfigProvider, Result } from 'antd'
import antdCss from '../generated/antd.css?url'
import appCss from '../styles.css?url'
import { theme } from '../theme'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'assertchecks' },
    ],
    links: [
      { rel: 'stylesheet', href: antdCss },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: () => (
    <Result status="404" title="Not found" subTitle="This page does not exist or you do not have access to it." />
  ),
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ConfigProvider theme={theme}>
          <App>{children}</App>
        </ConfigProvider>
        <Scripts />
      </body>
    </html>
  )
}
