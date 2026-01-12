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

vi.mock('@/lib/auth-client', () => ({
    authClient: {
        organization: {
            listMembers: vi.fn(async () => ({ members: [], total: 0 })),
            inviteMember: vi.fn(async () => ({})),
            updateMemberRole: vi.fn(async () => ({})),
            removeMember: vi.fn(async () => ({})),
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

        it('should call useSuspenseQuery with teamId when provided', async () => {
            const { useSuspenseQuery } = await import('@tanstack/react-query');
            const { useTeamMembers } = await import('./use-team-members');

            const teamId = 'team-123';
            useTeamMembers(teamId);

            expect(useSuspenseQuery).toHaveBeenCalledWith(
                expect.objectContaining({ queryKey: ['organization-members', teamId] })
            );
        });

        it('should call useSuspenseQuery with null when teamId is null', async () => {
            const { useSuspenseQuery } = await import('@tanstack/react-query');
            const { useTeamMembers } = await import('./use-team-members');

            useTeamMembers(null);

            expect(useSuspenseQuery).toHaveBeenCalledWith(
                expect.objectContaining({ queryKey: ['organization-members', null] })
            );
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

            lastMutationOptions?.onSuccess?.(undefined, { organizationId: 'team-123' }, undefined);

            expect(invalidateQueriesMock).toHaveBeenCalledWith({
                queryKey: ['organization-members', 'team-123'],
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

        it('invalidates team member queries on success', async () => {
            const { useUpdateTeamMember } = await import('./use-team-members');

            useUpdateTeamMember();

            lastMutationOptions?.onSuccess?.(undefined, { organizationId: 'team-123' }, undefined);

            expect(invalidateQueriesMock).toHaveBeenCalledWith({
                queryKey: ['organization-members', 'team-123'],
            });
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

        it('invalidates team member queries on success', async () => {
            const { useDeleteTeamMember } = await import('./use-team-members');

            useDeleteTeamMember();

            lastMutationOptions?.onSuccess?.(undefined, { organizationId: 'team-123' }, undefined);

            expect(invalidateQueriesMock).toHaveBeenCalledWith({
                queryKey: ['organization-members', 'team-123'],
            });
        });
    });
});

describe('use-team-members types', () => {
    it('should export CreateTeamMemberParams type', async () => {
        const params: import('./use-team-members').CreateTeamMemberParams = {
            organizationId: 'org-123',
            email: 'member@example.com',
            role: 'member',
        };
        expect(params.role).toBe('member');
    });

    it('should export CreateTeamMemberParams with ADMIN role', async () => {
        const params: import('./use-team-members').CreateTeamMemberParams = {
            organizationId: 'org-123',
            email: 'admin@example.com',
            role: 'admin',
        };
        expect(params.role).toBe('admin');
    });

    it('should export CreateTeamMemberParams with OWNER role', async () => {
        const params: import('./use-team-members').CreateTeamMemberParams = {
            organizationId: 'org-123',
            email: 'owner@example.com',
            role: 'owner',
        };
        expect(params.role).toBe('owner');
    });

    it('should export UpdateTeamMemberParams type', async () => {
        const params: import('./use-team-members').UpdateTeamMemberParams = {
            memberId: 'member-123',
            organizationId: 'org-123',
            role: 'admin',
        };
        expect(params.role).toBe('admin');
    });
});
