'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useConvex } from 'convex/react';
import { api } from '@repo/backend/convex/_generated/api';

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_PAGINATION_OPTS = {
    paginationOpts: {
        numItems: DEFAULT_PAGE_SIZE,
        cursor: null,
    },
};

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
    searchValue?: string;
    paginationOpts?: {
        numItems: number;
        cursor: string | null;
    };
}) {
    const { searchValue, paginationOpts = DEFAULT_PAGINATION_OPTS.paginationOpts } = options ?? {};

    return useQuery({
        ...convexQuery(api.admin.listUsers, {
            searchValue: searchValue || undefined,
            paginationOpts,
        }),
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
