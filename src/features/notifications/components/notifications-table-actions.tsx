'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useConvexMutation, convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { invalidateConvexQuery } from '@/features/convex/query-keys';

const NOTIFICATIONS_QUERY = convexQuery(api.notifications.getNotificationsByUser, {
    paginationOpts: { numItems: 20, cursor: null },
});
const UNREAD_COUNT_QUERY = convexQuery(api.notifications.getUnreadNotificationCount, {});

export function useSetNotificationRead(onSuccess?: () => void) {
    const t = useTranslations('Notifications');
    const queryClient = useQueryClient();
    const setNotificationRead = useConvexMutation(api.notifications.setNotificationRead);

    const { mutate, mutateAsync, isPending } = useMutation({
        mutationFn: setNotificationRead,
        onSuccess: () => {
            onSuccess?.();
            invalidateConvexQuery(queryClient, NOTIFICATIONS_QUERY);
            queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY.queryKey });
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
    const deleteNotification = useConvexMutation(api.notifications.deleteNotification);

    const { mutate, mutateAsync, isPending } = useMutation({
        mutationFn: deleteNotification,
        onSuccess: () => {
            onSuccess?.();
            invalidateConvexQuery(queryClient, NOTIFICATIONS_QUERY);
            queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY.queryKey });
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
    const markAllNotificationsRead = useConvexMutation(api.notifications.markAllNotificationsRead);

    const { mutate, mutateAsync, isPending } = useMutation({
        mutationFn: () => markAllNotificationsRead({}),
        onError: () => {
            toast.error(t('toast.markAllFailed'));
        },
        onSettled: () => {
            invalidateConvexQuery(queryClient, NOTIFICATIONS_QUERY);
            queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY.queryKey });
        },
        onSuccess: () => {
            onSuccess?.();
            toast.success(t('toast.markAll'));
        },
    });

    return { markAllRead: mutate, markAllReadAsync: mutateAsync, isMarkingAllRead: isPending };
}
