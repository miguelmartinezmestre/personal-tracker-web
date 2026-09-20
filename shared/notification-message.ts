const NOTIFICATION_MESSAGE_KEYS = [
    'objectiveCompleted',
    'progressAdded',
    'deadlineToday',
    'deadlineUpcoming',
    'deadlineOverdue',
    'achievementEarned',
    'organizationAchievementEarned',
] as const;
type NotificationMessageKey = (typeof NOTIFICATION_MESSAGE_KEYS)[number];
export type NotificationMessage = {
    message: string;
    messageKey?: string;
    messageParams?: Record<string, string | number>;
};

const requiredParams: Record<NotificationMessageKey, Record<string, 'string' | 'number'>> = {
    objectiveCompleted: { title: 'string' },
    progressAdded: { title: 'string', amount: 'number', unit: 'string' },
    deadlineToday: { title: 'string', deadline: 'number' },
    deadlineUpcoming: { title: 'string', deadline: 'number', days: 'number' },
    deadlineOverdue: { title: 'string', deadline: 'number', days: 'number' },
    achievementEarned: { code: 'string', points: 'number', threshold: 'number' },
    organizationAchievementEarned: { code: 'string', points: 'number', threshold: 'number' },
};

function isMessageKey(key: string): key is NotificationMessageKey {
    return NOTIFICATION_MESSAGE_KEYS.some(candidate => candidate === key);
}

export function formatNotificationMessage(
    notification: NotificationMessage,
    locale: string,
    translate: (key: NotificationMessageKey, params: Record<string, string | number>) => string,
    achievementName: (code: string, threshold: number) => string
): string {
    const key = notification.messageKey;
    if (!key || !isMessageKey(key)) {
        return notification.message;
    }
    const params = { ...notification.messageParams };
    if (
        Object.entries(requiredParams[key]).some(
            ([name, type]) =>
                typeof params[name] !== type ||
                (type === 'number' && !Number.isFinite(params[name]))
        )
    ) {
        return notification.message;
    }
    try {
        if (typeof params.deadline === 'number') {
            params.date = new Intl.DateTimeFormat(locale, { timeZone: 'UTC' }).format(
                params.deadline
            );
        }
        if (typeof params.code === 'string' && typeof params.threshold === 'number') {
            params.name = achievementName(params.code, params.threshold);
        }
        return translate(key, params).trim();
    } catch {
        return notification.message;
    }
}
