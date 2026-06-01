'use client';

import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

export function useSetNotificationRead(onSuccess?: () => void) {
    const t = useTranslations('Notifications');
    const setNotificationRead = useConvexMutation(api.notifications.setNotificationRead);

    const { mutate, mutateAsync, isPending } = useMutation({
        mutationFn: setNotificationRead,
        onSuccess: () => {
            onSuccess?.();
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
    const deleteNotification = useConvexMutation(api.notifications.deleteNotification);

    const { mutate, mutateAsync, isPending } = useMutation({
        mutationFn: deleteNotification,
        onSuccess: () => {
            onSuccess?.();
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
    const markAllNotificationsRead = useConvexMutation(api.notifications.markAllNotificationsRead);

    const { mutate, mutateAsync, isPending } = useMutation({
        mutationFn: () => markAllNotificationsRead({}),
        onError: () => {
            toast.error(t('toast.markAllFailed'));
        },
        onSuccess: () => {
            onSuccess?.();
            toast.success(t('toast.markAll'));
        },
    });

    return { markAllRead: mutate, markAllReadAsync: mutateAsync, isMarkingAllRead: isPending };
}
