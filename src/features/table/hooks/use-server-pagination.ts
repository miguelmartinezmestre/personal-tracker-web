import { useState, useCallback } from 'react';

const DEFAULT_PAGE_SIZE = 20;

export function useServerPagination(initialPageSize: number = DEFAULT_PAGE_SIZE) {
    const [currentPage, setCurrentPage] = useState(0);
    const [cursors, setCursors] = useState<(string | null)[]>([null]); // cursor for each page
    const [isDone, setIsDone] = useState(false);

    const getPaginationOpts = useCallback(
        (page: number) => ({
            numItems: initialPageSize,
            cursor: cursors[page] ?? null,
        }),
        [cursors, initialPageSize]
    );

    const updateCursor = useCallback((page: number, cursor: string | null, done: boolean) => {
        setCursors(prev => {
            const nextIndex = page + 1;
            const currentCursor = prev[nextIndex] ?? null;
            const hasCapacity = prev.length > nextIndex;

            if (hasCapacity && currentCursor === cursor) {
                return prev;
            }

            const newCursors = [...prev];
            // Ensure array is large enough
            while (newCursors.length <= page) {
                newCursors.push(null);
            }
            newCursors[nextIndex] = cursor; // Store cursor for NEXT page
            return newCursors;
        });
        setIsDone(prev => (prev === done ? prev : done));
    }, []);

    const nextPage = useCallback(() => {
        if (isDone) return;
        setCurrentPage(p => p + 1);
    }, [isDone]);

    const previousPage = useCallback(() => {
        setCurrentPage(p => Math.max(0, p - 1));
    }, []);

    const goToPage = useCallback((page: number) => {
        setCurrentPage(Math.max(0, page));
    }, []);

    const reset = useCallback(() => {
        setCurrentPage(0);
        setCursors([null]);
        setIsDone(false);
    }, []);

    return {
        currentPage,
        pageSize: initialPageSize,
        cursors,
        isDone,
        getPaginationOpts,
        updateCursor,
        nextPage,
        previousPage,
        goToPage,
        reset,
        hasNextPage: !isDone,
        hasPreviousPage: currentPage > 0,
    };
}
