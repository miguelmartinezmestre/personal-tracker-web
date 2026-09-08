import { v, type Infer } from 'convex/values';
import { TIME } from '../../utils/constants';
import { currentUtcCivilDay } from '../../../shared/civil-date';

export const deadlineRangeValidator = v.union(
    v.literal('today'),
    v.literal('week'),
    v.literal('month'),
    v.literal('overdue')
);

export type DeadlineRange = Infer<typeof deadlineRangeValidator>;

export function getDeadlineRangeBounds(range: DeadlineRange, now = Date.now()) {
    const todayStart = currentUtcCivilDay(now);
    const tomorrowStart = todayStart + TIME.DAY_MS;
    const today = new Date(todayStart);
    const nextMonthStart = Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1);

    switch (range) {
        case 'today':
            return { gte: todayStart, lt: tomorrowStart };
        case 'week':
            return { gte: todayStart, lt: todayStart + 7 * TIME.DAY_MS };
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
    if (deadline < bounds.gte) {
        return false;
    }
    if (deadline >= bounds.lt) {
        return false;
    }
    return true;
}
