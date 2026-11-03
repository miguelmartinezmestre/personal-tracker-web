import type { Doc } from '../../_generated/dataModel';
import { DEFAULT_DUE_SOON_DAYS } from '../objectives/constants';
import { progressPercent } from '../objectives/records';
import { DAY_MS } from '../objectives/rules';
import type { Notice } from './validators';

const MILESTONES = [25, 50, 75];

const formatDate = (date: number) =>
    new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(date);

export function progressNotice(before: Doc<'objectives'>, after: Doc<'objectives'>): Notice | null {
    const title = after.title;

    if (before.status === 'active' && after.status === 'completed') {
        return {
            notificationType: 'status',
            messageKey: 'objectiveCompleted',
            messageParams: { title },
            message: `Objective "${title}" has been completed.`,
        };
    }

    const from = progressPercent(before);
    const to = progressPercent(after);
    const percent = MILESTONES.filter(milestone => from < milestone && milestone <= to).at(-1);

    if (percent === undefined) {
        return null;
    }

    return {
        notificationType: 'progress',
        messageKey: 'progressMilestone',
        messageParams: { title, percent },
        message: `Objective "${title}" reached ${percent}% of its target.`,
    };
}

export function deadlineNotice(objective: Doc<'objectives'>, today: number): Notice | null {
    if (objective.deadline === undefined) {
        return null;
    }

    const { title, deadline } = objective;
    const days = Math.round((deadline - today) / DAY_MS);
    const date = formatDate(deadline);

    if (days === -1) {
        return {
            notificationType: 'deadline',
            messageKey: 'deadlineOverdue',
            messageParams: { title, deadline },
            message: `Objective "${title}" is overdue since ${date}.`,
        };
    }

    if (days === 0) {
        return {
            notificationType: 'deadline',
            messageKey: 'deadlineToday',
            messageParams: { title, deadline },
            message: `Objective "${title}" is due today.`,
        };
    }

    if (days === (objective.dueSoonDays ?? DEFAULT_DUE_SOON_DAYS)) {
        return {
            notificationType: 'deadline',
            messageKey: 'deadlineUpcoming',
            messageParams: { title, deadline, days },
            message: `Objective "${title}" is due in ${days} days, on ${date}.`,
        };
    }

    return null;
}

export function achievementNotice(achievement: {
    code: string;
    points: number;
    scope: 'individual' | 'organization';
}): Notice {
    const { code, points } = achievement;

    if (achievement.scope === 'organization') {
        return {
            notificationType: 'achievement',
            messageKey: 'organizationAchievementEarned',
            messageParams: { code, points },
            message: `Your organization unlocked the achievement "${code}" and earned ${points} points.`,
        };
    }

    return {
        notificationType: 'achievement',
        messageKey: 'achievementEarned',
        messageParams: { code, points },
        message: `You unlocked the achievement "${code}" and earned ${points} points.`,
    };
}
