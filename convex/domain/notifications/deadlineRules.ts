import type { Doc } from '../../_generated/dataModel';
import { TIME } from '../../utils/constants';
import { toUtcCivilDay } from '../../../shared/civil-date';

const DEADLINE_SOON_DAYS = 3;
// Stop emitting daily "overdue" reminders after this many days so a
// perpetually-overdue active objective doesn't accrue notifications forever.
const OVERDUE_REMINDER_LIMIT_DAYS = 7;

export function getDeadlineDayWindow(now: number) {
    const date = new Date(now);
    date.setUTCHours(0, 0, 0, 0);
    const dayStart = date.getTime();
    const dayEnd = dayStart + TIME.DAY_MS;

    return {
        dayStart,
        dayEnd,
        // Upper bound for the cron scan: today plus the look-ahead horizon, so
        // upcoming deadlines reach buildDeadlineMessage and trigger "due in N days"
        // advance reminders (it filters past DEADLINE_SOON_DAYS itself).
        scanUpperBound: dayEnd + DEADLINE_SOON_DAYS * TIME.DAY_MS,
    };
}

const formatDate = (timestamp: number) =>
    new Intl.DateTimeFormat('en', { timeZone: 'UTC' }).format(new Date(timestamp));

export function buildDeadlineMessage(
    objective: Doc<'objectives'>,
    _now: number,
    dayStart: number,
    dayEnd: number
) {
    if (!objective.deadline) {
        return null;
    }
    const deadlineDay = toUtcCivilDay(objective.deadline);

    if (deadlineDay < dayStart) {
        const daysOverdue = Math.max(1, Math.round((dayStart - deadlineDay) / TIME.DAY_MS));
        if (daysOverdue > OVERDUE_REMINDER_LIMIT_DAYS) {
            return null;
        }
        return `Objective "${objective.title}" is overdue by ${daysOverdue} day${
            daysOverdue === 1 ? '' : 's'
        } (due on ${formatDate(deadlineDay)}).`;
    }

    const isDueToday = deadlineDay >= dayStart && deadlineDay < dayEnd;
    if (isDueToday) {
        return `Objective "${objective.title}" is due today (${formatDate(deadlineDay)}).`;
    }

    const daysUntil = Math.round((deadlineDay - dayStart) / TIME.DAY_MS);
    if (daysUntil > DEADLINE_SOON_DAYS) {
        return null;
    }

    return `Objective "${objective.title}" is due in ${daysUntil} day${
        daysUntil === 1 ? '' : 's'
    } (${formatDate(deadlineDay)}).`;
}
