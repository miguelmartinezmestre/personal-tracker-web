import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the external dependencies
vi.mock('convex/react', () => ({
    useQuery: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn(),
}));

vi.mock('@convex-dev/react-query', () => ({
    convexQuery: vi.fn((fn, args) => ({
        queryKey: ['convex', 'mock', args],
        queryFn: vi.fn(),
    })),
}));

vi.mock('@repo/backend/convex/_generated/api', () => ({
    api: {
        auth: {
            getCurrentUser: 'getCurrentUser',
            isAuthenticated: 'isAuthenticated',
        },
    },
}));

describe('use-auth hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('useCurrentUser', () => {
        it('should be a function', async () => {
            const { useCurrentUser } = await import('./use-auth');
            expect(typeof useCurrentUser).toBe('function');
        });

        it('should call useQuery with skip when skip is true', async () => {
            const { useQuery } = await import('convex/react');
            const { useCurrentUser } = await import('./use-auth');

            useCurrentUser(true);

            expect(useQuery).toHaveBeenCalledWith('getCurrentUser', 'skip');
        });

        it('should call useQuery with empty object when skip is false', async () => {
            const { useQuery } = await import('convex/react');
            const { useCurrentUser } = await import('./use-auth');

            useCurrentUser(false);

            expect(useQuery).toHaveBeenCalledWith('getCurrentUser', {});
        });

        it('should call useQuery with empty object when skip is undefined', async () => {
            const { useQuery } = await import('convex/react');
            const { useCurrentUser } = await import('./use-auth');

            useCurrentUser();

            expect(useQuery).toHaveBeenCalledWith('getCurrentUser', {});
        });
    });

    describe('useIsAuthenticated', () => {
        it('should be a function', async () => {
            const { useIsAuthenticated } = await import('./use-auth');
            expect(typeof useIsAuthenticated).toBe('function');
        });

        it('should call useQuery from react-query', async () => {
            const { useQuery } = await import('@tanstack/react-query');
            const { useIsAuthenticated } = await import('./use-auth');

            useIsAuthenticated();

            expect(useQuery).toHaveBeenCalled();
        });
    });
});
