import { createFileRoute, redirect } from '@tanstack/react-router'
import { Result } from 'antd'

export const Route = createFileRoute('/_app/p/')({
  beforeLoad: ({ context }) => {
    const target = context.me.lastProject ?? context.me.projects[0]?.slug
    if (target) throw redirect({ to: '/p/$project', params: { project: target } })
  },
  component: () => (
    <Result status="info" title="No projects yet" subTitle="Ask an administrator to add you to a project." />
  ),
})
