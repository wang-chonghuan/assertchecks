import { ClerkProvider } from '@clerk/tanstack-react-start'
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { App, ConfigProvider, Result } from 'antd'
import antdCss from '#antd-css?url'
import appCss from '../styles.css?url'
import { ASSERTCHECKS_STYLE, clerkAppearance, theme } from '../theme'
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
      // The body typeface, preloaded so text does not render in the fallback first.
      { rel: 'preload', href: '/fonts/space-grotesk/space-grotesk-latin.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
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
        <ClerkProvider appearance={clerkAppearance} signInUrl="/login" afterSignOutUrl="/login">
          <ConfigProvider theme={theme}>
            <App>{children}</App>
          </ConfigProvider>
        </ClerkProvider>
        <Scripts />
      </body>
    </html>
  )
}
