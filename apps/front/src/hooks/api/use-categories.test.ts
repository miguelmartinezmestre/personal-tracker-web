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
        categories: {
            getCategoriesByUser: 'getCategoriesByUser',
            createCategory: 'createCategory',
            updateCategory: 'updateCategory',
            deleteCategory: 'deleteCategory',
            createDefaultCategories: 'createDefaultCategories',
        },
    },
}));

describe('use-categories hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        lastMutationOptions = undefined;
        invalidateQueriesMock.mockReset();
    });

    describe('useCategories', () => {
        it('should be a function', async () => {
            const { useCategories } = await import('./use-categories');
            expect(typeof useCategories).toBe('function');
        });

        it('should call useQuery', async () => {
            const { useQuery } = await import('@tanstack/react-query');
            const { useCategories } = await import('./use-categories');

            useCategories();

            expect(useQuery).toHaveBeenCalled();
        });

        it('should return query result', async () => {
            const { useCategories } = await import('./use-categories');

            const result = useCategories();

            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('isLoading');
        });
    });

    describe('useCreateCategory', () => {
        it('should be a function', async () => {
            const { useCreateCategory } = await import('./use-categories');
            expect(typeof useCreateCategory).toBe('function');
        });

        it('should return mutation result', async () => {
            const { useCreateCategory } = await import('./use-categories');

            const result = useCreateCategory();

            expect(result).toHaveProperty('mutate');
            expect(result).toHaveProperty('mutateAsync');
        });

        it('invalidates categories query on success', async () => {
            const { useCreateCategory } = await import('./use-categories');

            useCreateCategory();

            lastMutationOptions?.onSuccess?.();

            expect(invalidateQueriesMock).toHaveBeenCalledWith({
                queryKey: ['convex', 'getCategoriesByUser', {}],
            });
        });
    });

    describe('useUpdateCategory', () => {
        it('should be a function', async () => {
            const { useUpdateCategory } = await import('./use-categories');
            expect(typeof useUpdateCategory).toBe('function');
        });

        it('should return mutation result', async () => {
            const { useUpdateCategory } = await import('./use-categories');

            const result = useUpdateCategory();

            expect(result).toHaveProperty('mutate');
        });

        it('invalidates categories query on success', async () => {
            const { useUpdateCategory } = await import('./use-categories');

            useUpdateCategory();

            lastMutationOptions?.onSuccess?.();

            expect(invalidateQueriesMock).toHaveBeenCalledWith({
                queryKey: ['convex', 'getCategoriesByUser', {}],
            });
        });
    });

    describe('useDeleteCategory', () => {
        it('should be a function', async () => {
            const { useDeleteCategory } = await import('./use-categories');
            expect(typeof useDeleteCategory).toBe('function');
        });

        it('should return mutation result', async () => {
            const { useDeleteCategory } = await import('./use-categories');

            const result = useDeleteCategory();

            expect(result).toHaveProperty('mutate');
        });

        it('invalidates categories query on success', async () => {
            const { useDeleteCategory } = await import('./use-categories');

            useDeleteCategory();

            lastMutationOptions?.onSuccess?.();

            expect(invalidateQueriesMock).toHaveBeenCalledWith({
                queryKey: ['convex', 'getCategoriesByUser', {}],
            });
        });
    });

    describe('useCreateDefaultCategories', () => {
        it('should be a function', async () => {
            const { useCreateDefaultCategories } = await import('./use-categories');
            expect(typeof useCreateDefaultCategories).toBe('function');
        });

        it('should return mutation result', async () => {
            const { useCreateDefaultCategories } = await import('./use-categories');

            const result = useCreateDefaultCategories();

            expect(result).toHaveProperty('mutate');
        });

        it('invalidates categories query on success', async () => {
            const { useCreateDefaultCategories } = await import('./use-categories');

            useCreateDefaultCategories();

            lastMutationOptions?.onSuccess?.();

            expect(invalidateQueriesMock).toHaveBeenCalledWith({
                queryKey: ['convex', 'getCategoriesByUser', {}],
            });
        });
    });
});

describe('use-categories types', () => {
    it('should export CreateCategoryParams type', async () => {
        const params: import('./use-categories').CreateCategoryParams = {
            name: 'Work',
            color: '#FF0000',
        };
        expect(params.name).toBe('Work');
        expect(params.color).toBe('#FF0000');
    });

    it('should export CreateCategoryParams with optional icon', async () => {
        const params: import('./use-categories').CreateCategoryParams = {
            name: 'Health',
            color: '#00FF00',
            icon: 'heart',
        };
        expect(params.icon).toBe('heart');
    });

    it('should export UpdateCategoryParams type', async () => {
        const params: import('./use-categories').UpdateCategoryParams = {
            id: 'category-id' as any,
            name: 'Updated Category',
        };
        expect(params.name).toBe('Updated Category');
    });
});
