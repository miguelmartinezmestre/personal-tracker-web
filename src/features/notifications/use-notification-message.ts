'use client';
import { useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { formatNotificationMessage, type NotificationMessage } from '@shared/notification-message';

export function useNotificationMessage() {
    const locale = useLocale();
    const t = useTranslations('Notifications.messages');
    const achievements = useTranslations('Achievements');
    return useCallback(
        (notification: NotificationMessage) =>
            formatNotificationMessage(
                notification,
                locale,
                (key, params) => t(key, params),
                (code, threshold) =>
                    achievements.has(`definitions.${code}.name`)
                        ? achievements(`definitions.${code}.name`, { threshold })
                        : code
            ),
        [locale, t, achievements]
    );
}
