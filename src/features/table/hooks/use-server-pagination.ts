import { useCallback, useMemo, useReducer } from 'react';

const DEFAULT_PAGE_SIZE = 20;

type State = {
    currentPage: number;
    cursors: (string | null)[];
};

type Action = { type: 'next'; cursor: string } | { type: 'prev' } | { type: 'reset' };

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

export function useServerPagination(initialPageSize: number = DEFAULT_PAGE_SIZE) {
    const [state, dispatch] = useReducer(reducer, { currentPage: 0, cursors: [null] });

    const paginationOpts = useMemo(
        () => ({
            numItems: initialPageSize,
            cursor: state.cursors[state.currentPage] ?? null,
        }),
        [state.currentPage, state.cursors, initialPageSize]
    );

    const nextPage = useCallback(
        (continueCursor: string | null | undefined, isDone: boolean = false) => {
            if (isDone || !continueCursor) return;
            dispatch({ type: 'next', cursor: continueCursor });
        },
        []
    );

    const previousPage = useCallback(() => {
        dispatch({ type: 'prev' });
    }, []);

    const reset = useCallback(() => {
        dispatch({ type: 'reset' });
    }, []);

    return {
        currentPage: state.currentPage,
        pageSize: initialPageSize,
        cursors: state.cursors,
        paginationOpts,
        nextPage,
        previousPage,
        reset,
        hasPreviousPage: state.currentPage > 0,
    };
}
