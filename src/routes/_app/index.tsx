import { createFileRoute, redirect } from '@tanstack/react-router'
import { Result } from 'antd'

export const Route = createFileRoute('/_app/')({
  beforeLoad: ({ context }) => {
    const [first] = context.me.projects
    if (first) throw redirect({ to: '/p/$project', params: { project: first.slug } })
  },
  component: () => (
    <Result status="info" title="No projects yet" subTitle="Ask an administrator to add you to a project." />
  ),
})
