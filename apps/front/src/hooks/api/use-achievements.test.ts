import { describe, it, expect, vi, beforeEach } from 'vitest';

let lastMutationOptions: any;
const invalidateQueriesMock = vi.fn();

// Mock the external dependencies
vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn(() => ({
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
        achievements: {
            getAchievementDefinitions: 'getAchievementDefinitions',
            getUserAchievements: 'getUserAchievements',
            getTeamAchievements: 'getTeamAchievements',
            getUserAchievementStats: 'getUserAchievementStats',
            getRecentAchievements: 'getRecentAchievements',
            getUserAchievementProgress: 'getUserAchievementProgress',
            getUnviewedAchievementsCount: 'getUnviewedAchievementsCount',
            seedAchievementDefinitions: 'seedAchievementDefinitions',
        },
    },
}));

describe('use-achievements hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        lastMutationOptions = undefined;
        invalidateQueriesMock.mockReset();
    });

    describe('useAchievementDefinitions', () => {
        it('should be a function', async () => {
            const { useAchievementDefinitions } = await import('./use-achievements');
            expect(typeof useAchievementDefinitions).toBe('function');
        });

        it('should call useQuery', async () => {
            const { useQuery } = await import('@tanstack/react-query');
            const { useAchievementDefinitions } = await import('./use-achievements');

            useAchievementDefinitions();

            expect(useQuery).toHaveBeenCalled();
        });

        it('should call convexQuery with empty object when no type provided', async () => {
            const { convexQuery } = await import('@convex-dev/react-query');
            const { useAchievementDefinitions } = await import('./use-achievements');

            useAchievementDefinitions();

            expect(convexQuery).toHaveBeenCalledWith('getAchievementDefinitions', {});
        });

        it('should call convexQuery with type when provided', async () => {
            const { convexQuery } = await import('@convex-dev/react-query');
            const { useAchievementDefinitions } = await import('./use-achievements');

            useAchievementDefinitions('individual');

            expect(convexQuery).toHaveBeenCalledWith('getAchievementDefinitions', { type: 'individual' });
        });

        it('should accept team type', async () => {
            const { convexQuery } = await import('@convex-dev/react-query');
            const { useAchievementDefinitions } = await import('./use-achievements');

            useAchievementDefinitions('team');

            expect(convexQuery).toHaveBeenCalledWith('getAchievementDefinitions', { type: 'team' });
        });
    });

    describe('useUserAchievements', () => {
        it('should be a function', async () => {
            const { useUserAchievements } = await import('./use-achievements');
            expect(typeof useUserAchievements).toBe('function');
        });

        it('should call useQuery', async () => {
            const { useQuery } = await import('@tanstack/react-query');
            const { useUserAchievements } = await import('./use-achievements');

            useUserAchievements();

            expect(useQuery).toHaveBeenCalled();
        });

        it('should return query result', async () => {
            const { useUserAchievements } = await import('./use-achievements');

            const result = useUserAchievements();

            expect(result).toHaveProperty('data');
        });
    });

    describe('useTeamAchievements', () => {
        it('should be a function', async () => {
            const { useTeamAchievements } = await import('./use-achievements');
            expect(typeof useTeamAchievements).toBe('function');
        });

        it('should call convexQuery with skip when teamId is null', async () => {
            const { convexQuery } = await import('@convex-dev/react-query');
            const { useTeamAchievements } = await import('./use-achievements');

            useTeamAchievements(null);

            expect(convexQuery).toHaveBeenCalledWith('getTeamAchievements', 'skip');
        });

        it('should call convexQuery with teamId when provided', async () => {
            const { convexQuery } = await import('@convex-dev/react-query');
            const { useTeamAchievements } = await import('./use-achievements');

            useTeamAchievements('team-123');

            expect(convexQuery).toHaveBeenCalledWith('getTeamAchievements', { teamId: 'team-123' });
        });
    });

    describe('useUserAchievementStats', () => {
        it('should be a function', async () => {
            const { useUserAchievementStats } = await import('./use-achievements');
            expect(typeof useUserAchievementStats).toBe('function');
        });

        it('should call useQuery', async () => {
            const { useQuery } = await import('@tanstack/react-query');
            const { useUserAchievementStats } = await import('./use-achievements');

            useUserAchievementStats();

            expect(useQuery).toHaveBeenCalled();
        });
    });

    describe('useRecentAchievements', () => {
        it('should be a function', async () => {
            const { useRecentAchievements } = await import('./use-achievements');
            expect(typeof useRecentAchievements).toBe('function');
        });

        it('should use default limit of 5', async () => {
            const { convexQuery } = await import('@convex-dev/react-query');
            const { useRecentAchievements } = await import('./use-achievements');

            useRecentAchievements();

            expect(convexQuery).toHaveBeenCalledWith('getRecentAchievements', { limit: 5 });
        });

        it('should accept custom limit', async () => {
            const { convexQuery } = await import('@convex-dev/react-query');
            const { useRecentAchievements } = await import('./use-achievements');

            useRecentAchievements(10);

            expect(convexQuery).toHaveBeenCalledWith('getRecentAchievements', { limit: 10 });
        });
    });

    describe('useUserAchievementProgress', () => {
        it('should be a function', async () => {
            const { useUserAchievementProgress } = await import('./use-achievements');
            expect(typeof useUserAchievementProgress).toBe('function');
        });

        it('should call useQuery', async () => {
            const { useQuery } = await import('@tanstack/react-query');
            const { useUserAchievementProgress } = await import('./use-achievements');

            useUserAchievementProgress();

            expect(useQuery).toHaveBeenCalled();
        });
    });

    describe('useUnviewedAchievementsCount', () => {
        it('should be a function', async () => {
            const { useUnviewedAchievementsCount } = await import('./use-achievements');
            expect(typeof useUnviewedAchievementsCount).toBe('function');
        });

        it('should call useQuery', async () => {
            const { useQuery } = await import('@tanstack/react-query');
            const { useUnviewedAchievementsCount } = await import('./use-achievements');

            useUnviewedAchievementsCount();

            expect(useQuery).toHaveBeenCalled();
        });
    });

    describe('useSeedAchievements', () => {
        it('should be a function', async () => {
            const { useSeedAchievements } = await import('./use-achievements');
            expect(typeof useSeedAchievements).toBe('function');
        });

        it('should return mutation result', async () => {
            const { useSeedAchievements } = await import('./use-achievements');

            const result = useSeedAchievements();

            expect(result).toHaveProperty('mutate');
            expect(result).toHaveProperty('mutateAsync');
        });

        it('invalidates achievement definitions on success', async () => {
            const { useSeedAchievements } = await import('./use-achievements');

            useSeedAchievements();

            lastMutationOptions?.onSuccess?.();

            expect(invalidateQueriesMock).toHaveBeenCalledWith({
                queryKey: ['convex', 'getAchievementDefinitions', {}],
            });
        });
    });
});
