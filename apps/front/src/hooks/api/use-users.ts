'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';

/**
 * Tipos para las operaciones de usuarios
 */
export interface UpdateAccountDetailsParams {
    email: string;
    username: string;
}

/**
 * Hook para obtener los detalles de la cuenta del usuario actual
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useAccountDetails() {
    return useQuery(convexQuery(api.users.getAccountDetails, {}));
}

/**
 * Hook para obtener el rol del usuario actual
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useUserRole() {
    return useQuery(convexQuery(api.users.getUserRole, {}));
}

/**
 * Hook para actualizar los detalles de la cuenta del usuario
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useUpdateAccountDetails() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.users.updateAccountDetails),
        onSuccess: () => {
            // Invalidar la query de detalles de cuenta
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.users.getAccountDetails, {}).queryKey,
            });
        },
    });
}

