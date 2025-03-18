import { Outlet, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Fragment } from 'react';

export const Route = createRootRoute({
    component: RootComponent,
});

function RootComponent() {
    return (
        <Fragment>
            <Outlet />
            {/* <TanStackRouterDevtools /> */}
            {/* <ReactQueryDevtools /> */}
        </Fragment>
    );
}
