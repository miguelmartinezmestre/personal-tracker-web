import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { Fragment } from 'react'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <Fragment>
      {/* <div>Hello "__root"!</div> */}
      <Outlet />
      <TanStackRouterDevtools />
    </Fragment>
  )
}
