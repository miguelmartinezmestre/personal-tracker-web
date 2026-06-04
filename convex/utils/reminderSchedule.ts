import { TIME } from './constants';

type ReminderInterval = string | undefined;

export const computeNextReminderAt = (
    interval: ReminderInterval,
    now: number = Date.now()
): number | undefined => {
    if (!interval || interval === 'none') {
        return undefined;
    }

    if (interval === 'monthly') {
        const current = new Date(now);
        const currentDay = current.getDate();
        const nextMonth = new Date(current);
        nextMonth.setFullYear(current.getFullYear(), current.getMonth() + 1, 1);
        const lastDayOfNextMonth = new Date(
            nextMonth.getFullYear(),
            nextMonth.getMonth() + 1,
            0
        ).getDate();
        nextMonth.setDate(Math.min(currentDay, lastDayOfNextMonth));
        return nextMonth.getTime();
    }

    if (interval === 'biweekly') {
        const next = new Date(now);
        const dayOfMonth = next.getDate();

        if (dayOfMonth < 15) {
            next.setDate(15);
            return next.getTime();
        }

        next.setMonth(next.getMonth() + 1, 1);
        return next.getTime();
    }

    return now + 14 * TIME.DAY_MS;
};
