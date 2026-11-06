'use client';

import { catchError, type ErrorInfo } from 'next/error';
import { QueryErrorFallback } from '@/components/ui/query-error-fallback';

// Paginated Convex queries throw while rendering; this keeps a failing list from taking down the
// rest of the page. `reset` is enough to retry: the data comes from client queries, not the server.
function QueryErrorBoundaryFallback({ className }: { className?: string }, { reset }: ErrorInfo) {
    return <QueryErrorFallback className={className} onRetry={reset} />;
}

export const QueryErrorBoundary = catchError(QueryErrorBoundaryFallback);
