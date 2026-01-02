import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

export function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
            },
            mutations: {
                retry: false,
            },
        },
    });
}

export function createWrapper() {
    const queryClient = createTestQueryClient();
    return function Wrapper({ children }: { children: ReactNode }) {
        return (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        );
    };
}

export const mockConvexQuery = vi.fn().mockImplementation((fn, args) => ({
    queryKey: ['convex', fn?.toString() || 'mock', args],
    queryFn: vi.fn(),
}));

export const mockConvexMutation = vi.fn().mockImplementation(() => vi.fn());
