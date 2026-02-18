'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useConvexMutation, convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

export function useSetNotificationRead(onSuccess?: () => void) {
    const t = useTranslations('Notifications');
    const queryClient = useQueryClient();

    const { mutate, mutateAsync, isPending } = useMutation({
        mutationFn: useConvexMutation(api.notifications.setNotificationRead),
        onSuccess: () => {
            onSuccess?.();
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.notifications.getNotificationsByUser, {
                    paginationOpts: { numItems: 20, cursor: null },
                }).queryKey,
            });
            toast.success(t('toast.updated'));
        },
        onError: () => {
            toast.error(t('toast.updateFailed'));
        },
    });

    return {
        setNotificationRead: mutate,
        setNotificationReadAsync: mutateAsync,
        isSettingRead: isPending,
    };
}

export function useDeleteNotification(onSuccess?: () => void) {
    const t = useTranslations('Notifications');
    const queryClient = useQueryClient();

    const { mutate, mutateAsync, isPending } = useMutation({
        mutationFn: useConvexMutation(api.notifications.deleteNotification),
        onSuccess: () => {
            onSuccess?.();
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.notifications.getNotificationsByUser, {
                    paginationOpts: { numItems: 20, cursor: null },
                }).queryKey,
            });
            toast.success(t('toast.deleted'));
        },
        onError: () => {
            toast.error(t('toast.deleteFailed'));
        },
    });

    return {
        deleteNotification: mutate,
        deleteNotificationAsync: mutateAsync,
        isDeletingNotification: isPending,
    };
}

export function useMarkAllNotificationsRead(onSuccess?: () => void) {
    const t = useTranslations('Notifications');
    const queryClient = useQueryClient();

    const { mutate, mutateAsync, isPending } = useMutation({
        mutationFn: () => useConvexMutation(api.notifications.markAllNotificationsRead)({}),
        onMutate: async () => {
            await queryClient.cancelQueries({
                queryKey: convexQuery(api.notifications.getNotificationsByUser, {
                    paginationOpts: { numItems: 20, cursor: null },
                }).queryKey,
            });

            const previousNotifications = queryClient.getQueryData(
                convexQuery(api.notifications.getNotificationsByUser, {
                    paginationOpts: { numItems: 20, cursor: null },
                }).queryKey
            );

            queryClient.setQueryData(
                convexQuery(api.notifications.getNotificationsByUser, {
                    paginationOpts: { numItems: 20, cursor: null },
                }).queryKey,
                (old: any) => {
                    if (!old?.page) return old;
                    return {
                        ...old,
                        page: old.page.map((notification: any) => ({
                            ...notification,
                            read: true,
                        })),
                    };
                }
            );

            queryClient.setQueryData(
                convexQuery(api.notifications.getUnreadNotificationCount, {}).queryKey,
                { count: 0 }
            );

            return { previousNotifications };
        },
        onError: (_err, _variables, context) => {
            queryClient.setQueryData(
                convexQuery(api.notifications.getNotificationsByUser, {
                    paginationOpts: { numItems: 20, cursor: null },
                }).queryKey,
                context?.previousNotifications
            );
            toast.error(t('toast.markAllFailed'));
        },
        onSettled: () => {
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.notifications.getNotificationsByUser, {
                    paginationOpts: { numItems: 20, cursor: null },
                }).queryKey,
            });
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.notifications.getUnreadNotificationCount, {}).queryKey,
            });
        },
        onSuccess: () => {
            onSuccess?.();
            toast.success(t('toast.markAll'));
        },
    });

    return { markAllRead: mutate, markAllReadAsync: mutateAsync, isMarkingAllRead: isPending };
}
