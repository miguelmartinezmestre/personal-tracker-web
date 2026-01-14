import { useState, useCallback } from 'react';

const DEFAULT_PAGE_SIZE = 20;

export interface PaginationState {
    currentPage: number;
    pageSize: number;
}

export interface PaginationActions {
    nextPage: () => void;
    previousPage: () => void;
    goToPage: (page: number) => void;
    resetPage: () => void;
}

export function usePagination(pageSize: number = DEFAULT_PAGE_SIZE) {
    const [currentPage, setCurrentPage] = useState(0);

    const nextPage = useCallback(() => {
        setCurrentPage(prev => prev + 1);
    }, []);

    const previousPage = useCallback(() => {
        setCurrentPage(prev => Math.max(0, prev - 1));
    }, []);

    const goToPage = useCallback((page: number) => {
        setCurrentPage(Math.max(0, page));
    }, []);

    const resetPage = useCallback(() => {
        setCurrentPage(0);
    }, []);

    return {
        state: { currentPage, pageSize },
        actions: { nextPage, previousPage, goToPage, resetPage },
    };
}

export function usePaginationState(totalItems: number | undefined, pageSize: number = DEFAULT_PAGE_SIZE) {
    const [currentPage, setCurrentPage] = useState(0);
    const totalPages = totalItems ? Math.ceil(totalItems / pageSize) : 0;

    const goToPage = useCallback((page: number) => {
        setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
    }, [totalPages]);

    const nextPage = useCallback(() => {
        setCurrentPage(prev => Math.min(prev + 1, totalPages - 1));
    }, [totalPages]);

    const previousPage = useCallback(() => {
        setCurrentPage(prev => Math.max(0, prev - 1));
    }, []);

    const resetPage = useCallback(() => {
        setCurrentPage(0);
    }, []);

    return {
        currentPage,
        totalPages,
        nextPage,
        previousPage,
        goToPage,
        resetPage,
    };
}
