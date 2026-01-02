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
        update_progress: {
            getUpdateProgressByObjectiveId: 'getUpdateProgressByObjectiveId',
            createUpdateProgress: 'createUpdateProgress',
            updateUpdateProgress: 'updateUpdateProgress',
            deleteUpdateProgress: 'deleteUpdateProgress',
        },
        objectives: {
            getObjectiveById: 'getObjectiveById',
            getObjectivesByUser: 'getObjectivesByUser',
        },
    },
}));

describe('use-update-progress hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        lastMutationOptions = undefined;
        invalidateQueriesMock.mockReset();
    });

    describe('useUpdateProgressByObjective', () => {
        it('should be a function', async () => {
            const { useUpdateProgressByObjective } = await import('./use-update-progress');
            expect(typeof useUpdateProgressByObjective).toBe('function');
        });

        it('should call convexQuery with skip when objectiveId is null', async () => {
            const { convexQuery } = await import('@convex-dev/react-query');
            const { useUpdateProgressByObjective } = await import('./use-update-progress');

            useUpdateProgressByObjective(null);

            expect(convexQuery).toHaveBeenCalledWith('getUpdateProgressByObjectiveId', 'skip');
        });

        it('should call convexQuery with objectiveId when provided', async () => {
            const { convexQuery } = await import('@convex-dev/react-query');
            const { useUpdateProgressByObjective } = await import('./use-update-progress');

            const objectiveId = 'objective-123' as any;
            useUpdateProgressByObjective(objectiveId);

            expect(convexQuery).toHaveBeenCalledWith('getUpdateProgressByObjectiveId', { objectiveId });
        });

        it('should return query result', async () => {
            const { useUpdateProgressByObjective } = await import('./use-update-progress');

            const result = useUpdateProgressByObjective(null);

            expect(result).toHaveProperty('data');
        });
    });

    describe('useCreateUpdateProgress', () => {
        it('should be a function', async () => {
            const { useCreateUpdateProgress } = await import('./use-update-progress');
            expect(typeof useCreateUpdateProgress).toBe('function');
        });

        it('should return mutation result', async () => {
            const { useCreateUpdateProgress } = await import('./use-update-progress');

            const result = useCreateUpdateProgress();

            expect(result).toHaveProperty('mutate');
            expect(result).toHaveProperty('mutateAsync');
        });

        it('invalidates related queries on success', async () => {
            const { useCreateUpdateProgress } = await import('./use-update-progress');

            useCreateUpdateProgress();

            lastMutationOptions?.onSuccess?.(undefined, { objective: 'obj-123' }, undefined);

            expect(invalidateQueriesMock).toHaveBeenCalledWith({
                queryKey: ['convex', 'getUpdateProgressByObjectiveId', { objectiveId: 'obj-123' }],
            });
            expect(invalidateQueriesMock).toHaveBeenCalledWith({
                queryKey: ['convex', 'getObjectiveById', { id: 'obj-123' }],
            });
            expect(invalidateQueriesMock).toHaveBeenCalledWith({
                queryKey: ['convex', 'getObjectivesByUser', {}],
            });
        });
    });

    describe('useUpdateUpdateProgress', () => {
        it('should be a function', async () => {
            const { useUpdateUpdateProgress } = await import('./use-update-progress');
            expect(typeof useUpdateUpdateProgress).toBe('function');
        });

        it('should return mutation result', async () => {
            const { useUpdateUpdateProgress } = await import('./use-update-progress');

            const result = useUpdateUpdateProgress();

            expect(result).toHaveProperty('mutate');
        });

        it('invalidates update progress queries with predicate', async () => {
            const { useUpdateUpdateProgress } = await import('./use-update-progress');

            useUpdateUpdateProgress();

            lastMutationOptions?.onSuccess?.();

            const predicate = invalidateQueriesMock.mock.calls[0][0].predicate;
            expect(predicate({ queryKey: ['convex', 'update_progress.list'] })).toBe(true);
            expect(predicate({ queryKey: ['convex', 'objectives.list'] })).toBe(true);
            expect(predicate({ queryKey: ['convex', 'other'] })).toBe(false);
        });
    });

    describe('useDeleteUpdateProgress', () => {
        it('should be a function', async () => {
            const { useDeleteUpdateProgress } = await import('./use-update-progress');
            expect(typeof useDeleteUpdateProgress).toBe('function');
        });

        it('should return mutation result', async () => {
            const { useDeleteUpdateProgress } = await import('./use-update-progress');

            const result = useDeleteUpdateProgress();

            expect(result).toHaveProperty('mutate');
        });

        it('invalidates update progress queries with predicate', async () => {
            const { useDeleteUpdateProgress } = await import('./use-update-progress');

            useDeleteUpdateProgress();

            lastMutationOptions?.onSuccess?.();

            const predicate = invalidateQueriesMock.mock.calls[0][0].predicate;
            expect(predicate({ queryKey: ['convex', 'update_progress.detail'] })).toBe(true);
            expect(predicate({ queryKey: ['convex', 'objectives.detail'] })).toBe(true);
            expect(predicate({ queryKey: ['other', 'update_progress.detail'] })).toBe(false);
        });
    });
});

describe('use-update-progress types', () => {
    it('should export CreateUpdateProgressParams type', async () => {
        const params: import('./use-update-progress').CreateUpdateProgressParams = {
            objective: 'objective-123' as any,
            updatedValue: 50,
            updateDate: Date.now(),
        };
        expect(params.updatedValue).toBe(50);
    });

    it('should export CreateUpdateProgressParams with optional comment', async () => {
        const params: import('./use-update-progress').CreateUpdateProgressParams = {
            objective: 'objective-123' as any,
            updatedValue: 75,
            updateDate: Date.now(),
            comment: 'Great progress!',
        };
        expect(params.comment).toBe('Great progress!');
    });

    it('should export UpdateUpdateProgressParams type', async () => {
        const params: import('./use-update-progress').UpdateUpdateProgressParams = {
            id: 'progress-123' as any,
            updatedValue: 100,
            updateDate: Date.now(),
        };
        expect(params.updatedValue).toBe(100);
    });

    it('should export UpdateUpdateProgressParams with optional comment', async () => {
        const params: import('./use-update-progress').UpdateUpdateProgressParams = {
            id: 'progress-123' as any,
            updatedValue: 100,
            updateDate: Date.now(),
            comment: 'Completed!',
        };
        expect(params.comment).toBe('Completed!');
    });
});
