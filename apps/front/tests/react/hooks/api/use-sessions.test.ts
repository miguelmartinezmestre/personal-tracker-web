import { describe, it, expect, vi, beforeEach } from 'vitest';

let lastMutationOptions: any;
const invalidateQueriesMock = vi.fn();

// Mock the external dependencies
vi.mock('@tanstack/react-query', () => ({
    useSuspenseQuery: vi.fn(() => ({
        data: [],
        isLoading: false,
        isError: false,
    })),
    useMutation: vi.fn(options => {
        lastMutationOptions = options;
        return {
            mutate: vi.fn(),
            mutateAsync: vi.fn(),
            isLoading: false,
            isError: false,
            isSuccess: false,
        };
    }),
    useQueryClient: vi.fn(() => ({
        invalidateQueries: invalidateQueriesMock,
    })),
}));

vi.mock('@convex-dev/react-query', () => ({
    convexQuery: vi.fn((fn, args) => ({
        queryKey: ['convex', String(fn), args],
        queryFn: vi.fn(),
    })),
    useConvexMutation: vi.fn(() => vi.fn()),
}));

vi.mock('@repo/backend/convex/_generated/api', () => ({
    api: {
        sessions: {
            getSessionsByUser: 'getSessionsByUser',
            invalidateSession: 'invalidateSession',
        },
    },
}));

describe('use-sessions hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        lastMutationOptions = undefined;
        invalidateQueriesMock.mockReset();
    });

    describe('useSessions', () => {
        it('should be a function', async () => {
            const { useSessions } = await import('../../../../src/hooks/api/use-sessions');
            expect(typeof useSessions).toBe('function');
        });

        it('should call useSuspenseQuery', async () => {
            const { useSuspenseQuery } = await import('@tanstack/react-query');
            const { useSessions } = await import('../../../../src/hooks/api/use-sessions');

            useSessions();

            expect(useSuspenseQuery).toHaveBeenCalled();
        });

        it('should return query result', async () => {
            const { useSessions } = await import('../../../../src/hooks/api/use-sessions');

            const result = useSessions();

            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('isLoading');
        });
    });

    describe('useInvalidateSession', () => {
        it('should be a function', async () => {
            const { useInvalidateSession } = await import('../../../../src/hooks/api/use-sessions');
            expect(typeof useInvalidateSession).toBe('function');
        });

        it('should return mutation result', async () => {
            const { useInvalidateSession } = await import('../../../../src/hooks/api/use-sessions');

            const result = useInvalidateSession();

            expect(result).toHaveProperty('mutate');
            expect(result).toHaveProperty('mutateAsync');
        });

        it('invalidates sessions query on success', async () => {
            const { useInvalidateSession } = await import('../../../../src/hooks/api/use-sessions');

            useInvalidateSession();

            lastMutationOptions?.onSuccess?.();

            expect(invalidateQueriesMock).toHaveBeenCalledWith({
                queryKey: ['convex', 'getSessionsByUser', {}],
            });
        });
    });
});
