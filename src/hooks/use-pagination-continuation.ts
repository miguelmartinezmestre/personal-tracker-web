'use client';
import { useCallback, useState } from 'react';

export function usePaginationContinuation(baseCursor: string | null, scope: string) {
    const [continuation, setContinuation] = useState<{
        base: string | null;
        scope: string;
        cursor: string;
    } | null>(null);
    if (continuation && (continuation.base !== baseCursor || continuation.scope !== scope)) {
        setContinuation(null);
    }
    const cursor =
        continuation?.base === baseCursor && continuation.scope === scope
            ? continuation.cursor
            : baseCursor;
    const follow = useCallback(
        (page: { needsContinuation?: boolean; continueCursor: string } | undefined) => {
            if (page?.needsContinuation) {
                setContinuation({ base: baseCursor, scope, cursor: page.continueCursor });
            }
        },
        [baseCursor, scope]
    );
    const reset = useCallback(() => setContinuation(null), []);
    return { cursor, follow, reset };
}
