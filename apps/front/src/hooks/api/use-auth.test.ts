import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the external dependencies
vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn(() => ({ data: null })),
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
            const { useQuery } = await import('@tanstack/react-query');
            const { convexQuery } = await import('@convex-dev/react-query');
            const { api } = await import('@repo/backend/convex/_generated/api');
            const { useCurrentUser } = await import('./use-auth');

            useCurrentUser(true);

            expect(convexQuery).toHaveBeenCalledWith(api.auth.getCurrentUser, 'skip');
            expect(useQuery).toHaveBeenCalled();
        });

        it('should call useQuery with empty object when skip is false', async () => {
            const { useQuery } = await import('@tanstack/react-query');
            const { convexQuery } = await import('@convex-dev/react-query');
            const { api } = await import('@repo/backend/convex/_generated/api');
            const { useCurrentUser } = await import('./use-auth');

            useCurrentUser(false);

            expect(convexQuery).toHaveBeenCalledWith(api.auth.getCurrentUser, {});
            expect(useQuery).toHaveBeenCalled();
        });

        it('should call useQuery with empty object when skip is undefined', async () => {
            const { useQuery } = await import('@tanstack/react-query');
            const { convexQuery } = await import('@convex-dev/react-query');
            const { api } = await import('@repo/backend/convex/_generated/api');
            const { useCurrentUser } = await import('./use-auth');

            useCurrentUser();

            expect(convexQuery).toHaveBeenCalledWith(api.auth.getCurrentUser, {});
            expect(useQuery).toHaveBeenCalled();
        });
    });

    describe('useIsAuthenticated', () => {
        it('should be a function', async () => {
            const { useIsAuthenticated } = await import('./use-auth');
            expect(typeof useIsAuthenticated).toBe('function');
        });

        it('should call useQuery from react-query and return boolean', async () => {
            const { useQuery } = await import('@tanstack/react-query');
            const { convexQuery } = await import('@convex-dev/react-query');
            const { api } = await import('@repo/backend/convex/_generated/api');
            const { useIsAuthenticated } = await import('./use-auth');

            vi.mocked(useQuery).mockReturnValue({ data: true } as any);
            const result = useIsAuthenticated();

            expect(convexQuery).toHaveBeenCalledWith(api.auth.isAuthenticated, {});
            expect(useQuery).toHaveBeenCalled();
            expect(result).toBe(true);
        });
    });
});
