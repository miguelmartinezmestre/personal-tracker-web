'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useConvexMutation, convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

export function useSetNotificationRead(onSuccess?: () => void) {
  const t = useTranslations('Notifications');
  const queryClient = useQueryClient();
  const setNotificationRead = useConvexMutation(api.notifications.setNotificationRead);

  const { mutate, mutateAsync, isPending } = useMutation({
    mutationFn: setNotificationRead,
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
  const deleteNotification = useConvexMutation(api.notifications.deleteNotification);

  const { mutate, mutateAsync, isPending } = useMutation({
    mutationFn: deleteNotification,
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
  const markAllNotificationsRead = useConvexMutation(api.notifications.markAllNotificationsRead);

  const { mutate, mutateAsync, isPending } = useMutation({
    mutationFn: () => markAllNotificationsRead({}),
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
        (old: unknown) => {
          const data = old as { page?: Array<{ read?: boolean }> };
          if (!data?.page) return old;
          return {
            ...data,
            page: data.page.map(notification => ({
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
