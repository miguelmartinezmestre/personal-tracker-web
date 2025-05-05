import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { TRPCOptionsProxy } from '@trpc/tanstack-react-query';
import { Fragment } from 'react';
import { AppRouter } from '../../../backend/src/routers/app.router';
import { QueryClient } from '@tanstack/react-query';

export interface RouterAppContext {
    trpc: TRPCOptionsProxy<AppRouter>;
    queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
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
