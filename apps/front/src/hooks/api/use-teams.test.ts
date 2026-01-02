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
        teams: {
            getTeams: 'getTeams',
            getTeamById: 'getTeamById',
            createTeam: 'createTeam',
            updateTeam: 'updateTeam',
            deleteTeam: 'deleteTeam',
        },
    },
}));

describe('use-teams hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        lastMutationOptions = undefined;
        invalidateQueriesMock.mockReset();
    });

    describe('useTeams', () => {
        it('should be a function', async () => {
            const { useTeams } = await import('./use-teams');
            expect(typeof useTeams).toBe('function');
        });

        it('should call useSuspenseQuery', async () => {
            const { useSuspenseQuery } = await import('@tanstack/react-query');
            const { useTeams } = await import('./use-teams');

            useTeams();

            expect(useSuspenseQuery).toHaveBeenCalled();
        });

        it('should return query result', async () => {
            const { useTeams } = await import('./use-teams');

            const result = useTeams();

            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('isLoading');
        });
    });

    describe('useTeam', () => {
        it('should be a function', async () => {
            const { useTeam } = await import('./use-teams');
            expect(typeof useTeam).toBe('function');
        });

        it('should call convexQuery with skip when teamId is null', async () => {
            const { convexQuery } = await import('@convex-dev/react-query');
            const { useTeam } = await import('./use-teams');

            useTeam(null);

            expect(convexQuery).toHaveBeenCalledWith('getTeamById', 'skip');
        });

        it('should call convexQuery with _id when teamId is provided', async () => {
            const { convexQuery } = await import('@convex-dev/react-query');
            const { useTeam } = await import('./use-teams');

            const teamId = 'team-123' as any;
            useTeam(teamId);

            expect(convexQuery).toHaveBeenCalledWith('getTeamById', { _id: teamId });
        });
    });

    describe('useCreateTeam', () => {
        it('should be a function', async () => {
            const { useCreateTeam } = await import('./use-teams');
            expect(typeof useCreateTeam).toBe('function');
        });

        it('should return mutation result', async () => {
            const { useCreateTeam } = await import('./use-teams');

            const result = useCreateTeam();

            expect(result).toHaveProperty('mutate');
            expect(result).toHaveProperty('mutateAsync');
        });

        it('invalidates teams query on success', async () => {
            const { useCreateTeam } = await import('./use-teams');

            useCreateTeam();

            lastMutationOptions?.onSuccess?.();

            expect(invalidateQueriesMock).toHaveBeenCalledWith({
                queryKey: ['convex', 'getTeams', {}],
            });
        });
    });

    describe('useUpdateTeam', () => {
        it('should be a function', async () => {
            const { useUpdateTeam } = await import('./use-teams');
            expect(typeof useUpdateTeam).toBe('function');
        });

        it('should return mutation result', async () => {
            const { useUpdateTeam } = await import('./use-teams');

            const result = useUpdateTeam();

            expect(result).toHaveProperty('mutate');
        });

        it('invalidates teams query on success', async () => {
            const { useUpdateTeam } = await import('./use-teams');

            useUpdateTeam();

            lastMutationOptions?.onSuccess?.();

            expect(invalidateQueriesMock).toHaveBeenCalledWith({
                queryKey: ['convex', 'getTeams', {}],
            });
        });
    });

    describe('useDeleteTeam', () => {
        it('should be a function', async () => {
            const { useDeleteTeam } = await import('./use-teams');
            expect(typeof useDeleteTeam).toBe('function');
        });

        it('should return mutation result', async () => {
            const { useDeleteTeam } = await import('./use-teams');

            const result = useDeleteTeam();

            expect(result).toHaveProperty('mutate');
        });

        it('invalidates teams query on success', async () => {
            const { useDeleteTeam } = await import('./use-teams');

            useDeleteTeam();

            lastMutationOptions?.onSuccess?.();

            expect(invalidateQueriesMock).toHaveBeenCalledWith({
                queryKey: ['convex', 'getTeams', {}],
            });
        });
    });
});

describe('use-teams types', () => {
    it('should export CreateTeamParams type', async () => {
        const params: import('./use-teams').CreateTeamParams = {
            name: 'Test Team',
            description: 'A test team',
        };
        expect(params.name).toBe('Test Team');
    });

    it('should export UpdateTeamParams type', async () => {
        const params: import('./use-teams').UpdateTeamParams = {
            _id: 'team-id' as any,
            name: 'Updated Team',
            description: 'Updated description',
        };
        expect(params.name).toBe('Updated Team');
    });
});
