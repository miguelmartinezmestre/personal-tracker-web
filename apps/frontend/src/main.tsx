// import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { routeTree } from './routeTree.gen.ts';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import NotFound from './components/not-found.tsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './providers/theme-provider.tsx';
import './i18n';

export const baseUrl = 'http://localhost:3000';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // staleTime: 1000 * 60,
            // gcTime: 1000 * 60,
        },
    },
});

const router = createRouter({
    routeTree,
    defaultNotFoundComponent: () => <NotFound />,
    defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}

createRoot(document.getElementById('root') || document.createElement('div')).render(
    // <StrictMode>
    <ThemeProvider>
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
        </QueryClientProvider>
    </ThemeProvider>
    // </StrictMode>
);
