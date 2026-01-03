import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the external dependencies
vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn(() => ({
        data: null,
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
        users: {
            getUserRole: 'getUserRole',
        },
    },
}));

describe('use-users hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('useUserRole', () => {
        it('should be a function', async () => {
            const { useUserRole } = await import('./use-users');
            expect(typeof useUserRole).toBe('function');
        });

        it('should call useQuery', async () => {
            const { useQuery } = await import('@tanstack/react-query');
            const { useUserRole } = await import('./use-users');

            useUserRole();

            expect(useQuery).toHaveBeenCalled();
        });

        it('should return query result', async () => {
            const { useUserRole } = await import('./use-users');
            const result = useUserRole();
            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('isLoading');
        });
    });
});
