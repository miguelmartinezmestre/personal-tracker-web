import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the external dependencies
vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn(() => ({
        data: [],
        isLoading: false,
        isError: false,
    })),
}));

vi.mock('@convex-dev/react-query', () => ({
    convexQuery: vi.fn((fn, args) => ({
        queryKey: ['convex', String(fn), args],
        queryFn: vi.fn(),
    })),
}));

vi.mock('@repo/backend/convex/_generated/api', () => ({
    api: {
        auditLogs: {
            getAuditLogs: 'getAuditLogs',
        },
    },
}));

describe('use-admin hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('useAuditLogs', () => {
        it('should be a function', async () => {
            const { useAuditLogs } = await import('./use-admin');
            expect(typeof useAuditLogs).toBe('function');
        });

        it('should call useQuery', async () => {
            const { useQuery } = await import('@tanstack/react-query');
            const { useAuditLogs } = await import('./use-admin');

            useAuditLogs();

            expect(useQuery).toHaveBeenCalled();
        });

        it('should return query result', async () => {
            const { useAuditLogs } = await import('./use-admin');

            const result = useAuditLogs();

            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('isLoading');
            expect(result).toHaveProperty('isError');
        });
    });
});
