import { useCallback, useReducer, useState } from 'react';

type State = {
    currentPage: number;
    cursors: (string | null)[];
};

type Action = { type: 'next'; cursor: string } | { type: 'prev' } | { type: 'reset' };

type Continuation = { base: string | null; scope: string; cursor: string };

type PageWithContinuation = { needsContinuation?: boolean; continueCursor: string };

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case 'next': {
            const nextIndex = state.currentPage + 1;
            if (
                state.cursors[nextIndex] === action.cursor &&
                state.cursors.length === nextIndex + 1
            ) {
                return { ...state, currentPage: nextIndex };
            }
            const next = state.cursors.slice(0, nextIndex);
            next[nextIndex] = action.cursor;
            return { currentPage: nextIndex, cursors: next };
        }
        case 'prev':
            return { ...state, currentPage: Math.max(0, state.currentPage - 1) };
        case 'reset':
            return { currentPage: 0, cursors: [null] };
    }
}

export function useServerPagination(pageSize: number = 20, scope: string = '') {
    const [state, dispatch] = useReducer(reducer, { currentPage: 0, cursors: [null] });
    const [continuation, setContinuation] = useState<Continuation | null>(null);

    const baseCursor = state.cursors[state.currentPage] ?? null;
    if (continuation && (continuation.base !== baseCursor || continuation.scope !== scope)) {
        setContinuation(null);
    }
    const cursor =
        continuation?.base === baseCursor && continuation.scope === scope
            ? continuation.cursor
            : baseCursor;

    const follow = useCallback(
        (page: PageWithContinuation | undefined) => {
            if (page?.needsContinuation) {
                setContinuation({ base: baseCursor, scope, cursor: page.continueCursor });
            }
        },
        [baseCursor, scope]
    );

    const paginationOpts = {
        numItems: pageSize,
        cursor,
    };

    const nextPage = (continueCursor: string | null | undefined, isDone: boolean) => {
        if (isDone || !continueCursor) {
            return;
        }
        dispatch({ type: 'next', cursor: continueCursor });
    };

    const previousPage = () => {
        dispatch({ type: 'prev' });
    };

    const reset = () => {
        setContinuation(null);
        dispatch({ type: 'reset' });
    };

    return {
        paginationOpts,
        nextPage,
        previousPage,
        reset,
        follow,
        hasPreviousPage: state.currentPage > 0,
    };
}
