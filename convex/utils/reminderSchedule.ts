const DAY_MS = 24 * 60 * 60 * 1000;

type ReminderInterval = string | undefined;

const computeNextBiweeklyLikeReminderAt = (now: number) => {
    const next = new Date(now);
    const dayOfMonth = next.getDate();

    if (dayOfMonth < 15) {
        next.setDate(15);
        return next.getTime();
    }

    next.setMonth(next.getMonth() + 1, 1);
    return next.getTime();
};

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
        // Move to the 1st of the next month, then set the day.
        // Clamp to the last day of that month to avoid skipping months
        // (e.g. Jan 31 -> Feb 28, not Mar 3).
        const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, 1);
        const lastDayOfNextMonth = new Date(
            nextMonth.getFullYear(),
            nextMonth.getMonth() + 1,
            0
        ).getDate();
        nextMonth.setDate(Math.min(currentDay, lastDayOfNextMonth));
        return nextMonth.getTime();
    }

    if (interval === 'biweekly') {
        // In product terms this is "twice per month" (1st and 15th).
        return computeNextBiweeklyLikeReminderAt(now);
    }

    // Backward-compatible fallback for unknown values.
    return now + 14 * DAY_MS;
};
