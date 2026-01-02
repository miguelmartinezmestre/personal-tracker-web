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
        teamMembers: {
            getTeamMembersByTeamId: 'getTeamMembersByTeamId',
            createTeamMember: 'createTeamMember',
            updateTeamMember: 'updateTeamMember',
            deleteTeamMember: 'deleteTeamMember',
        },
    },
}));

describe('use-team-members hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        lastMutationOptions = undefined;
        invalidateQueriesMock.mockReset();
    });

    describe('useTeamMembers', () => {
        it('should be a function', async () => {
            const { useTeamMembers } = await import('./use-team-members');
            expect(typeof useTeamMembers).toBe('function');
        });

        it('should call convexQuery with skip when teamId is null', async () => {
            const { convexQuery } = await import('@convex-dev/react-query');
            const { useTeamMembers } = await import('./use-team-members');

            useTeamMembers(null);

            expect(convexQuery).toHaveBeenCalledWith('getTeamMembersByTeamId', 'skip');
        });

        it('should call convexQuery with team when teamId is provided', async () => {
            const { convexQuery } = await import('@convex-dev/react-query');
            const { useTeamMembers } = await import('./use-team-members');

            const teamId = 'team-123' as any;
            useTeamMembers(teamId);

            expect(convexQuery).toHaveBeenCalledWith('getTeamMembersByTeamId', { team: teamId });
        });

        it('should return query result', async () => {
            const { useTeamMembers } = await import('./use-team-members');

            const result = useTeamMembers(null);

            expect(result).toHaveProperty('data');
        });
    });

    describe('useCreateTeamMember', () => {
        it('should be a function', async () => {
            const { useCreateTeamMember } = await import('./use-team-members');
            expect(typeof useCreateTeamMember).toBe('function');
        });

        it('should return mutation result', async () => {
            const { useCreateTeamMember } = await import('./use-team-members');

            const result = useCreateTeamMember();

            expect(result).toHaveProperty('mutate');
            expect(result).toHaveProperty('mutateAsync');
        });

        it('invalidates team members query on success', async () => {
            const { useCreateTeamMember } = await import('./use-team-members');

            useCreateTeamMember();

            lastMutationOptions?.onSuccess?.(undefined, { team: 'team-123' }, undefined);

            expect(invalidateQueriesMock).toHaveBeenCalledWith({
                queryKey: ['convex', 'getTeamMembersByTeamId', { team: 'team-123' }],
            });
        });
    });

    describe('useUpdateTeamMember', () => {
        it('should be a function', async () => {
            const { useUpdateTeamMember } = await import('./use-team-members');
            expect(typeof useUpdateTeamMember).toBe('function');
        });

        it('should return mutation result', async () => {
            const { useUpdateTeamMember } = await import('./use-team-members');

            const result = useUpdateTeamMember();

            expect(result).toHaveProperty('mutate');
        });

        it('invalidates team member queries with predicate', async () => {
            const { useUpdateTeamMember } = await import('./use-team-members');

            useUpdateTeamMember();

            lastMutationOptions?.onSuccess?.();

            const predicate = invalidateQueriesMock.mock.calls[0][0].predicate;
            expect(predicate({ queryKey: ['convex', 'teamMembers.list'] })).toBe(true);
            expect(predicate({ queryKey: ['convex', 'other'] })).toBe(false);
            expect(predicate({ queryKey: ['other', 'teamMembers.list'] })).toBe(false);
        });
    });

    describe('useDeleteTeamMember', () => {
        it('should be a function', async () => {
            const { useDeleteTeamMember } = await import('./use-team-members');
            expect(typeof useDeleteTeamMember).toBe('function');
        });

        it('should return mutation result', async () => {
            const { useDeleteTeamMember } = await import('./use-team-members');

            const result = useDeleteTeamMember();

            expect(result).toHaveProperty('mutate');
        });

        it('invalidates team member queries with predicate', async () => {
            const { useDeleteTeamMember } = await import('./use-team-members');

            useDeleteTeamMember();

            lastMutationOptions?.onSuccess?.();

            const predicate = invalidateQueriesMock.mock.calls[0][0].predicate;
            expect(predicate({ queryKey: ['convex', 'teamMembers.detail'] })).toBe(true);
            expect(predicate({ queryKey: ['convex', 123] })).toBe(false);
            expect(predicate({ queryKey: ['other', 'teamMembers.detail'] })).toBe(false);
        });
    });
});

describe('use-team-members types', () => {
    it('should export CreateTeamMemberParams type', async () => {
        const params: import('./use-team-members').CreateTeamMemberParams = {
            team: 'org-123' as any,
            user: 'user-123',
            role: 'MEMBER',
        };
        expect(params.role).toBe('MEMBER');
    });

    it('should export CreateTeamMemberParams with MANAGER role', async () => {
        const params: import('./use-team-members').CreateTeamMemberParams = {
            team: 'org-123' as any,
            user: 'user-456',
            role: 'MANAGER',
        };
        expect(params.role).toBe('MANAGER');
    });

    it('should export UpdateTeamMemberParams type', async () => {
        const params: import('./use-team-members').UpdateTeamMemberParams = {
            id: 'member-123' as any,
            role: 'MANAGER',
        };
        expect(params.role).toBe('MANAGER');
    });
});
