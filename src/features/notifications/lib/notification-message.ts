import { formatObjectiveDate } from '@/features/objectives/lib/format';

type MessageParams = Record<string, string | number>;

const REQUIRED_PARAMS = {
    objectiveCompleted: { title: 'string' },
    progressMilestone: { title: 'string', percent: 'number' },
    deadlineUpcoming: { title: 'string', deadline: 'number', days: 'number' },
    deadlineToday: { title: 'string', deadline: 'number' },
    deadlineOverdue: { title: 'string', deadline: 'number' },
    achievementEarned: { code: 'string', points: 'number' },
    organizationAchievementEarned: { code: 'string', points: 'number' },
} as const satisfies Record<string, Record<string, 'string' | 'number'>>;

export type NotificationMessageKey = keyof typeof REQUIRED_PARAMS;

function isMessageKey(key: string): key is NotificationMessageKey {
    return Object.hasOwn(REQUIRED_PARAMS, key);
}

export function notificationText(
    notification: { messageKey: string; messageParams: MessageParams; message: string },
    locale: string,
    translate: (key: NotificationMessageKey, params: MessageParams) => string,
    achievementName: (code: string) => string | undefined
): string {
    const { messageKey: key, messageParams: params } = notification;

    if (
        !isMessageKey(key) ||
        Object.entries(REQUIRED_PARAMS[key]).some(([name, type]) => typeof params[name] !== type)
    ) {
        return notification.message;
    }

    const extra: MessageParams = {};

    if (typeof params.deadline === 'number') {
        extra.date = formatObjectiveDate(params.deadline, locale);
    }

    if (typeof params.code === 'string') {
        const name = achievementName(params.code);

        if (name === undefined) {
            return notification.message;
        }

        extra.name = name;
    }

    return translate(key, { ...params, ...extra });
}
