import { v, type Infer } from 'convex/values';

const DAY_MS = 24 * 60 * 60 * 1000;

export const deadlineRangeValidator = v.union(
    v.literal('today'),
    v.literal('week'),
    v.literal('month'),
    v.literal('overdue')
);

export type DeadlineRange = Infer<typeof deadlineRangeValidator>;

export function getDeadlineRangeBounds(range: DeadlineRange, now = Date.now()) {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const todayStart = startOfToday.getTime();
    const tomorrowStart = todayStart + DAY_MS;
    const nextMonthStart = new Date(
        startOfToday.getFullYear(),
        startOfToday.getMonth() + 1,
        1
    ).getTime();

    switch (range) {
        case 'today':
            return { gte: todayStart, lt: tomorrowStart };
        case 'week':
            return { gte: todayStart, lt: todayStart + 7 * DAY_MS };
        case 'month':
            return { gte: todayStart, lt: nextMonthStart };
        case 'overdue':
            return { gte: 0, lt: todayStart };
    }
}

export function matchesDeadlineRange(deadline: number | undefined, range: DeadlineRange) {
    if (deadline === undefined) {
        return false;
    }

    const bounds = getDeadlineRangeBounds(range);
    if (bounds.gte !== undefined && deadline < bounds.gte) {
        return false;
    }
    if (bounds.lt !== undefined && deadline >= bounds.lt) {
        return false;
    }
    return true;
}
