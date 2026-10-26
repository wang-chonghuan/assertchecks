import { createFileRoute } from '@tanstack/react-router'
import { Flex, Typography, theme } from 'antd'
import { Brand, PRODUCT_NAME } from '../components/brand'
import { pageFrame } from '../infui/page-frame'
import { space } from '../infui/tokens'

export const Route = createFileRoute('/privacy')({
  head: () => ({ meta: [{ title: `Privacy · ${PRODUCT_NAME}` }] }),
  component: PrivacyPage,
})

const CONTACT = 'wangchonghuan@gmail.com'

// What AssertChecks stores and why. Google requires this page before its sign-in can be offered to
// everyone; keep it to facts about the running system.
const SECTIONS: { title: string; text: string }[] = [
  {
    title: 'Signing in',
    text: `Sign-in is handled by Clerk (clerk.com). With an email code, Clerk stores your email address. With Google, Google shares your name, email address and profile picture with Clerk. ${PRODUCT_NAME} reads only your verified email address, to decide which projects you can see, and asks Google for nothing else.`,
  },
  {
    title: 'Project data',
    text: 'Projects send the results of their end-to-end test runs from their own CI: the test catalog, each case’s result and error message, and the versions under test. Reports that look like they contain credentials are rejected and not stored. A project’s data is shown only to the people added to that project.',
  },
  {
    title: 'Cookies',
    text: `Clerk sets the cookies that keep you signed in. ${PRODUCT_NAME} sets one cookie that remembers the last project you opened. There are no advertising or analytics cookies.`,
  },
  {
    title: 'Where it is kept',
    text: `The site and its database run on Microsoft Azure in the North Europe region. Clerk keeps sign-in data on its own infrastructure. Data is used only to run ${PRODUCT_NAME}; it is not sold or shared.`,
  },
  {
    title: 'Removal and questions',
    text: `To have your account or a project’s data removed, or to ask about this page, email ${CONTACT}.`,
  },
]

function PrivacyPage() {
  const { token } = theme.useToken()
  return (
    <div style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      <Flex vertical gap={space.group} style={{ ...pageFrame, maxWidth: token.screenMD, paddingBlock: space.section }}>
        <a href="/" aria-label={`${PRODUCT_NAME} home`}><Brand /></a>
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>Privacy</Typography.Title>
          <Typography.Text type="secondary">Last updated 19 October 2026</Typography.Text>
        </div>
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <Typography.Title level={5} style={{ marginTop: 0 }}>{section.title}</Typography.Title>
            <Typography.Paragraph style={{ margin: 0 }}>{section.text}</Typography.Paragraph>
          </div>
        ))}
      </Flex>
    </div>
  )
}
