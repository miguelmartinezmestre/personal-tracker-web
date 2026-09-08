'use client';

import type { ReactNode } from 'react';
import type { QueryState } from '@/lib/query-state';
import { Skeleton } from './ui/skeleton';
import { QueryErrorFallback } from './ui/query-error-fallback';

export function QueryContent({
    state,
    onRetry,
    empty,
    children,
}: {
    state: QueryState<unknown>;
    onRetry: () => void;
    empty: ReactNode;
    children: ReactNode;
}) {
    if (state.status === 'error') {
        return <QueryErrorFallback error={state.error} onRetry={onRetry} />;
    }
    if (state.status === 'loading') {
        return <Skeleton className="h-24 w-full" />;
    }
    if (state.status === 'empty') {
        return <p className="text-muted-foreground text-sm">{empty}</p>;
    }
    return children;
}
