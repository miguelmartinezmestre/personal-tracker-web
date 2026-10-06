'use client';
import { extractErrorCode } from '@/lib/error-messages';
import { useCallback, useState } from 'react';
import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import type { convexQuery } from '@convex-dev/react-query';

type Page<T> = { page: T[]; isDone: boolean; continueCursor: string; needsContinuation?: boolean };

export function useConvexPages<T>(
    scope: string,
    options: (cursor: string | null) => ReturnType<typeof convexQuery>,
    key: (item: T) => string
) {
    const [state, setState] = useState<{ scope: string; cursors: (string | null)[] }>({
        scope,
        cursors: [null],
    });
    const cursors = state.scope === scope ? state.cursors : [null];
    // The caller's generated Convex query supplies Page<T>; keep one live subscription per loaded segment.
    const queries = useQueries({ queries: cursors.map(options) }) as UseQueryResult<Page<T>>[];
    const last = queries.at(-1);
    const append = useCallback(
        (cursor: string) => {
            setState(previous => {
                const current = previous.scope === scope ? previous.cursors : [null];
                return {
                    scope,
                    cursors: current.includes(cursor) ? current : [...current, cursor],
                };
            });
        },
        [scope]
    );
    if (last?.data?.needsContinuation && !cursors.includes(last.data.continueCursor)) {
        append(last.data.continueCursor);
    }
    const items = queries.flatMap(query =>
        query.data && !query.data.needsContinuation ? query.data.page : []
    );
    const hasSettledPage = queries.some(query => query.data && !query.data.needsContinuation);
    let data: T[] | undefined;
    if (hasSettledPage) {
        data = [...new Map(items.map(item => [key(item), item])).values()];
    }
    const isFetching = Boolean(last?.isPending || last?.data?.needsContinuation);
    const invalidCursor = queries.some(query => extractErrorCode(query.error) === 'INVALID_CURSOR');
    if (invalidCursor && state.cursors.length > 1) {
        setState({ scope, cursors: [null] });
    }
    return {
        data,
        isPending: !data && isFetching,
        isLoading: !data && isFetching,
        isFetching,
        isError: queries.some(query => query.isError),
        hasMore: Boolean(last?.data && !last.data.isDone),
        loadMore: () => {
            if (last?.data && !last.data.isDone && !isFetching) {
                append(last.data.continueCursor);
            }
        },
        refetch: async () => {
            await Promise.all(queries.map(query => query.refetch()));
        },
    };
}
