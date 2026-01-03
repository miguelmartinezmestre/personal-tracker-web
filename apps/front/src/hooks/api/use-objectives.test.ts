import { describe, it, expect, vi, beforeEach } from 'vitest';

let lastMutationOptions: any;
const invalidateQueriesMock = vi.fn();

// Mock the external dependencies
vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn(),
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
        objectives: {
            getObjectivesByUser: 'getObjectivesByUser',
            getObjectiveById: 'getObjectiveById',
            createObjective: 'createObjective',
            updateObjective: 'updateObjective',
            deleteObjective: 'deleteObjective',
            completeObjective: 'completeObjective',
            pauseObjective: 'pauseObjective',
            archiveObjective: 'archiveObjective',
            updateObjectiveStatus: 'updateObjectiveStatus',
        },
    },
}));

describe('use-objectives hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        lastMutationOptions = undefined;
        invalidateQueriesMock.mockReset();
    });

    describe('useObjectives', () => {
        it('should be a function', async () => {
            const { useObjectives } = await import('./use-objectives');
            expect(typeof useObjectives).toBe('function');
        });

        it('should call useQuery', async () => {
            const { useQuery } = await import('@tanstack/react-query');
            const { useObjectives } = await import('./use-objectives');

            useObjectives();

            expect(useQuery).toHaveBeenCalled();
        });
    });

    describe('useObjective', () => {
        it('should be a function', async () => {
            const { useObjective } = await import('./use-objectives');
            expect(typeof useObjective).toBe('function');
        });

        it('should call useQuery with skip when objectiveId is null', async () => {
            const { convexQuery } = await import('@convex-dev/react-query');
            const { useObjective } = await import('./use-objectives');

            useObjective(null);

            expect(convexQuery).toHaveBeenCalledWith('getObjectiveById', 'skip');
        });

        it('should call useQuery with id when objectiveId is provided', async () => {
            const { convexQuery } = await import('@convex-dev/react-query');
            const { useObjective } = await import('./use-objectives');

            const objectiveId = 'test-id' as any;
            useObjective(objectiveId);

            expect(convexQuery).toHaveBeenCalledWith('getObjectiveById', { id: objectiveId });
        });
    });

    describe('useCreateObjective', () => {
        it('should be a function', async () => {
            const { useCreateObjective } = await import('./use-objectives');
            expect(typeof useCreateObjective).toBe('function');
        });

        it('should return mutation result', async () => {
            const { useCreateObjective } = await import('./use-objectives');

            const result = useCreateObjective();

            expect(result).toHaveProperty('mutate');
            expect(result).toHaveProperty('mutateAsync');
        });

        it('invalidates objectives query on success', async () => {
            const { useCreateObjective } = await import('./use-objectives');

            useCreateObjective();

            lastMutationOptions?.onSuccess?.();

            expect(invalidateQueriesMock).toHaveBeenCalledWith({
                queryKey: ['convex', 'getObjectivesByUser', {}],
            });
        });
    });

    describe('useUpdateObjective', () => {
        it('should be a function', async () => {
            const { useUpdateObjective } = await import('./use-objectives');
            expect(typeof useUpdateObjective).toBe('function');
        });

        it('should return mutation result', async () => {
            const { useUpdateObjective } = await import('./use-objectives');

            const result = useUpdateObjective();

            expect(result).toHaveProperty('mutate');
        });

        it('invalidates objectives query on success', async () => {
            const { useUpdateObjective } = await import('./use-objectives');

            useUpdateObjective();

            lastMutationOptions?.onSuccess?.();

            expect(invalidateQueriesMock).toHaveBeenCalledWith({
                queryKey: ['convex', 'getObjectivesByUser', {}],
            });
        });
    });

    describe('useDeleteObjective', () => {
        it('should be a function', async () => {
            const { useDeleteObjective } = await import('./use-objectives');
            expect(typeof useDeleteObjective).toBe('function');
        });

        it('should return mutation result', async () => {
            const { useDeleteObjective } = await import('./use-objectives');

            const result = useDeleteObjective();

            expect(result).toHaveProperty('mutate');
        });

        it('invalidates objectives query on success', async () => {
            const { useDeleteObjective } = await import('./use-objectives');

            useDeleteObjective();

            lastMutationOptions?.onSuccess?.();

            expect(invalidateQueriesMock).toHaveBeenCalledWith({
                queryKey: ['convex', 'getObjectivesByUser', {}],
            });
        });
    });

    describe('useCompleteObjective', () => {
        it('should be a function', async () => {
            const { useCompleteObjective } = await import('./use-objectives');
            expect(typeof useCompleteObjective).toBe('function');
        });

        it('should return mutation result', async () => {
            const { useCompleteObjective } = await import('./use-objectives');

            const result = useCompleteObjective();

            expect(result).toHaveProperty('mutate');
        });

        it('invalidates objectives query on success', async () => {
            const { useCompleteObjective } = await import('./use-objectives');

            useCompleteObjective();

            lastMutationOptions?.onSuccess?.();

            expect(invalidateQueriesMock).toHaveBeenCalledWith({
                queryKey: ['convex', 'getObjectivesByUser', {}],
            });
        });
    });

    describe('usePauseObjective', () => {
        it('should be a function', async () => {
            const { usePauseObjective } = await import('./use-objectives');
            expect(typeof usePauseObjective).toBe('function');
        });

        it('should return mutation result', async () => {
            const { usePauseObjective } = await import('./use-objectives');

            const result = usePauseObjective();

            expect(result).toHaveProperty('mutate');
        });

        it('invalidates objectives query on success', async () => {
            const { usePauseObjective } = await import('./use-objectives');

            usePauseObjective();

            lastMutationOptions?.onSuccess?.();

            expect(invalidateQueriesMock).toHaveBeenCalledWith({
                queryKey: ['convex', 'getObjectivesByUser', {}],
            });
        });
    });

    describe('useArchiveObjective', () => {
        it('should be a function', async () => {
            const { useArchiveObjective } = await import('./use-objectives');
            expect(typeof useArchiveObjective).toBe('function');
        });

        it('should return mutation result', async () => {
            const { useArchiveObjective } = await import('./use-objectives');

            const result = useArchiveObjective();

            expect(result).toHaveProperty('mutate');
        });

        it('invalidates objectives query on success', async () => {
            const { useArchiveObjective } = await import('./use-objectives');

            useArchiveObjective();

            lastMutationOptions?.onSuccess?.();

            expect(invalidateQueriesMock).toHaveBeenCalledWith({
                queryKey: ['convex', 'getObjectivesByUser', {}],
            });
        });
    });

    describe('useUpdateObjectiveStatus', () => {
        it('should be a function', async () => {
            const { useUpdateObjectiveStatus } = await import('./use-objectives');
            expect(typeof useUpdateObjectiveStatus).toBe('function');
        });

        it('should return mutation result', async () => {
            const { useUpdateObjectiveStatus } = await import('./use-objectives');

            const result = useUpdateObjectiveStatus();

            expect(result).toHaveProperty('mutate');
        });

        it('invalidates objectives query on success', async () => {
            const { useUpdateObjectiveStatus } = await import('./use-objectives');

            useUpdateObjectiveStatus();

            lastMutationOptions?.onSuccess?.();

            expect(invalidateQueriesMock).toHaveBeenCalledWith({
                queryKey: ['convex', 'getObjectivesByUser', {}],
            });
        });
    });
});

describe('use-objectives types', () => {
    it('should export CreateObjectiveParams type', async () => {
        const module = await import('./use-objectives');
        // Type check - if this compiles, the type exists
        const params: import('./use-objectives').CreateObjectiveParams = {
            title: 'Test',
            targetValue: 100,
            currentValue: 0,
            status: 'active',
        };
        expect(params.title).toBe('Test');
    });

    it('should export UpdateObjectiveParams type', async () => {
        const module = await import('./use-objectives');
        // Type check
        const params: import('./use-objectives').UpdateObjectiveParams = {
            id: 'test-id' as any,
            title: 'Updated',
        };
        expect(params.title).toBe('Updated');
    });
});
