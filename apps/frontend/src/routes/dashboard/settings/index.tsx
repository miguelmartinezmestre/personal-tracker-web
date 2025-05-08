import { createFileRoute } from '@tanstack/react-router'
import { ConfirmationDeleteAccount } from '../../../components/confirmation'

export const Route = createFileRoute('/dashboard/settings/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>
    <ConfirmationDeleteAccount />
  </div>
}
