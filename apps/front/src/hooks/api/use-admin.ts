'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useConvex } from 'convex/react';
import { api } from '@repo/backend/convex/_generated/api';

/**
 * Hook para obtener los logs de auditoría
 */
export function useAuditLogs() {
    return useQuery(convexQuery(api.auditLogs.getAuditLogs, {}));
}

/**
 * Hook to list all users (admin only)
 */
export function useAdminUsers(options?: {
    limit?: number;
    offset?: number;
    searchValue?: string;
}) {
    const { limit = 10, offset = 0, searchValue } = options ?? {};

    return useQuery({
        ...convexQuery(api.admin.listUsers, {
            limit,
            offset,
            searchValue: searchValue || undefined,
        }),
        queryKey: ['admin-users', limit, offset, searchValue],
    });
}

/**
 * Hook to ban a user (admin only)
 */
export function useBanUser() {
    const convex = useConvex();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            userId,
            banReason,
            banExpires,
        }: {
            userId: string;
            banReason?: string;
            banExpires?: number;
        }) => {
            return convex.mutation(api.admin.banUser, { userId, banReason, banExpires });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
    });
}

/**
 * Hook to unban a user (admin only)
 */
export function useUnbanUser() {
    const convex = useConvex();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId }: { userId: string }) => {
            return convex.mutation(api.admin.unbanUser, { userId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
    });
}

/**
 * Hook to update user role (admin only)
 */
export function useUpdateUserRole() {
    const convex = useConvex();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
            return convex.mutation(api.admin.updateUserRole, { userId, role });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
    });
}

/**
 * Hook to delete a user (admin only)
 */
export function useDeleteUser() {
    const convex = useConvex();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId }: { userId: string }) => {
            return convex.mutation(api.admin.deleteUser, { userId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
    });
}
