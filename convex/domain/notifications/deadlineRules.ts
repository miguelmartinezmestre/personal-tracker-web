import type { Doc } from '../../_generated/dataModel';
import { TIME } from '../../utils/constants';

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

const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString();

export function buildDeadlineMessage(
    objective: Doc<'objectives'>,
    now: number,
    dayStart: number,
    dayEnd: number
) {
    if (!objective.deadline) return null;

    if (objective.deadline <= now) {
        const daysOverdue = Math.max(1, Math.ceil((now - objective.deadline) / TIME.DAY_MS));
        if (daysOverdue > OVERDUE_REMINDER_LIMIT_DAYS) {
            return null;
        }
        return `Objective "${objective.title}" is overdue by ${daysOverdue} day${
            daysOverdue === 1 ? '' : 's'
        } (due on ${formatDate(objective.deadline)}).`;
    }

    const isDueToday = objective.deadline >= dayStart && objective.deadline < dayEnd;
    if (isDueToday) {
        return `Objective "${objective.title}" is due today (${formatDate(objective.deadline)}).`;
    }

    const daysUntil = Math.ceil((objective.deadline - now) / TIME.DAY_MS);
    if (daysUntil > DEADLINE_SOON_DAYS) return null;

    return `Objective "${objective.title}" is due in ${daysUntil} day${
        daysUntil === 1 ? '' : 's'
    } (${formatDate(objective.deadline)}).`;
}
