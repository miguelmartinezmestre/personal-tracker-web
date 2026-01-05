'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';

/**
 * Hook para obtener todas las categorías del usuario actual
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useCategories() {
    return useQuery(convexQuery(api.categories.getCategoriesByUser, {}));
}

/**
 * Hook para crear una nueva categoría
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useCreateCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.categories.createCategory),
        onSuccess: () => {
            // Invalidar la query de categorías para refrescar la lista
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.categories.getCategoriesByUser, {}).queryKey,
            });
        },
    });
}

/**
 * Hook para actualizar una categoría
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useUpdateCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.categories.updateCategory),
        onSuccess: () => {
            // Invalidar la query de categorías
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.categories.getCategoriesByUser, {}).queryKey,
            });
        },
    });
}

/**
 * Hook para eliminar una categoría
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useDeleteCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.categories.deleteCategory),
        onSuccess: () => {
            // Invalidar la query de categorías para refrescar la lista
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.categories.getCategoriesByUser, {}).queryKey,
            });
        },
    });
}

/**
 * Hook para crear categorías por defecto
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useCreateDefaultCategories() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.categories.createDefaultCategories),
        onSuccess: () => {
            // Invalidar la query de categorías para refrescar la lista
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.categories.getCategoriesByUser, {}).queryKey,
            });
        },
    });
}
