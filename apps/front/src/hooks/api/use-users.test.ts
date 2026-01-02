import { describe, it, expect, vi, beforeEach } from 'vitest';

let lastMutationOptions: any;
const invalidateQueriesMock = vi.fn();

// Mock the external dependencies
vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn(() => ({
        data: null,
        isLoading: false,
        isError: false,
    })),
    useMutation: vi.fn((options) => {
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
        users: {
            getAccountDetails: 'getAccountDetails',
            getUserRole: 'getUserRole',
            updateAccountDetails: 'updateAccountDetails',
        },
    },
}));

describe('use-users hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        lastMutationOptions = undefined;
        invalidateQueriesMock.mockReset();
    });

    describe('useAccountDetails', () => {
        it('should be a function', async () => {
            const { useAccountDetails } = await import('./use-users');
            expect(typeof useAccountDetails).toBe('function');
        });

        it('should call useQuery', async () => {
            const { useQuery } = await import('@tanstack/react-query');
            const { useAccountDetails } = await import('./use-users');

            useAccountDetails();

            expect(useQuery).toHaveBeenCalled();
        });

        it('should return query result', async () => {
            const { useAccountDetails } = await import('./use-users');

            const result = useAccountDetails();

            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('isLoading');
        });
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
        });
    });

    describe('useUpdateAccountDetails', () => {
        it('should be a function', async () => {
            const { useUpdateAccountDetails } = await import('./use-users');
            expect(typeof useUpdateAccountDetails).toBe('function');
        });

        it('should return mutation result', async () => {
            const { useUpdateAccountDetails } = await import('./use-users');

            const result = useUpdateAccountDetails();

            expect(result).toHaveProperty('mutate');
            expect(result).toHaveProperty('mutateAsync');
        });

        it('invalidates account details query on success', async () => {
            const { useUpdateAccountDetails } = await import('./use-users');

            useUpdateAccountDetails();

            lastMutationOptions?.onSuccess?.();

            expect(invalidateQueriesMock).toHaveBeenCalledWith({
                queryKey: ['convex', 'getAccountDetails', {}],
            });
        });
    });
});

describe('use-users types', () => {
    it('should export UpdateAccountDetailsParams type', async () => {
        const params: import('./use-users').UpdateAccountDetailsParams = {
            email: 'test@example.com',
            username: 'testuser',
        };
        expect(params.email).toBe('test@example.com');
        expect(params.username).toBe('testuser');
    });
});
