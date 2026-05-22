import type { Doc } from '../../_generated/dataModel';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEADLINE_SOON_DAYS = 3;

export function getDeadlineDayWindow(now: number) {
    const date = new Date(now);
    date.setUTCHours(0, 0, 0, 0);
    const dayStart = date.getTime();

    return {
        dayStart,
        dayEnd: dayStart + DAY_MS,
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
        const daysOverdue = Math.max(1, Math.ceil((now - objective.deadline) / DAY_MS));
        return `Objective "${objective.title}" is overdue by ${daysOverdue} day${
            daysOverdue === 1 ? '' : 's'
        } (due on ${formatDate(objective.deadline)}).`;
    }

    const isDueToday = objective.deadline >= dayStart && objective.deadline < dayEnd;
    if (isDueToday) {
        return `Objective "${objective.title}" is due today (${formatDate(objective.deadline)}).`;
    }

    const daysUntil = Math.ceil((objective.deadline - now) / DAY_MS);
    if (daysUntil > DEADLINE_SOON_DAYS) return null;

    return `Objective "${objective.title}" is due in ${daysUntil} day${
        daysUntil === 1 ? '' : 's'
    } (${formatDate(objective.deadline)}).`;
}
