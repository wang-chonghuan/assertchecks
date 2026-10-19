import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { App, ConfigProvider, Result } from 'antd'
import antdCss from '#antd-css?url'
import appCss from '../styles.css?url'
import { ASSERTCHECKS_STYLE, theme } from '../theme'
import { PRODUCT_NAME } from '../components/brand'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      // The mobile address bar matches the header.
      { name: 'theme-color', content: ASSERTCHECKS_STYLE.headerBg },
      { title: PRODUCT_NAME },
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
