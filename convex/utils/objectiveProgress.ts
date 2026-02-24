import type { Doc } from '../_generated/dataModel';

type ProgressMode = 'cumulative' | 'snapshot';

const resolveProgressMode = (mode?: string | null): ProgressMode => {
    return mode === 'snapshot' ? 'snapshot' : 'cumulative';
};

/**
 * Filter updates to only include those within the current period.
 * If the objective has no period (or period === 'none'), all updates are returned.
 *
 * The window auto-advances: if the original periodStart has passed, we calculate
 * which period cycle we are currently in and use that window.
 */
const filterUpdatesByPeriod = (
    objective: Pick<Doc<'objectives'>, 'period' | 'periodStart' | 'periodLengthDays'>,
    updates: { updatedValue: number; updateDate: number }[]
): { updatedValue: number; updateDate: number }[] => {
    if (!objective.period || objective.period === 'none') {
        return updates;
    }

    if (!objective.periodStart || !objective.periodLengthDays) {
        return updates;
    }

    const periodLengthMs = objective.periodLengthDays * 24 * 60 * 60 * 1000;
    const now = Date.now();

    // Advance the window to the current period cycle
    let periodStart = objective.periodStart;
    if (now >= periodStart + periodLengthMs) {
        const elapsed = now - periodStart;
        const cycles = Math.floor(elapsed / periodLengthMs);
        periodStart = periodStart + cycles * periodLengthMs;
    }
    const periodEnd = periodStart + periodLengthMs;

    return updates.filter(u => u.updateDate >= periodStart && u.updateDate < periodEnd);
};

export const computeCurrentValue = (
    objective: Pick<
        Doc<'objectives'>,
        | 'progressMode'
        | 'startValue'
        | 'currentValue'
        | 'period'
        | 'periodStart'
        | 'periodLengthDays'
    >,
    updates: { updatedValue: number; updateDate: number }[]
): number => {
    const mode = resolveProgressMode(objective.progressMode);
    const periodUpdates = filterUpdatesByPeriod(objective, updates);

    if (mode === 'snapshot') {
        if (periodUpdates.length === 0) {
            return objective.startValue ?? objective.currentValue ?? 0;
        }
        const latest = periodUpdates.reduce((acc, update) =>
            update.updateDate > acc.updateDate ? update : acc
        );
        return latest.updatedValue;
    }

    const base = objective.startValue ?? 0;
    if (periodUpdates.length === 0) {
        return base;
    }
    const total = periodUpdates.reduce((sum, update) => sum + update.updatedValue, 0);
    return base + total;
};

export const computeLastProgressAt = (updates: { updateDate: number }[]): number | undefined => {
    if (updates.length === 0) return undefined;
    return updates.reduce((max, update) => (update.updateDate > max ? update.updateDate : max), 0);
};

/**
 * Compute the progress percentage of an objective, accounting for direction
 * and startValue. Returns a value clamped between 0 and 100.
 */
export const computeProgressPercent = (objective: {
    currentValue: number;
    targetValue: number;
    startValue?: number | null;
    direction?: string | null;
}): number => {
    const current = objective.currentValue ?? 0;
    const target = objective.targetValue ?? 0;
    const direction = objective.direction ?? 'increase';
    const start =
        objective.startValue !== null && objective.startValue !== undefined
            ? objective.startValue
            : direction === 'decrease'
              ? current
              : 0;

    let percent = 0;

    if (direction === 'decrease') {
        const denom = start - target;
        if (denom <= 0) {
            percent = current <= target ? 100 : 0;
        } else {
            percent = ((start - current) / denom) * 100;
        }
    } else {
        const denom = target - start;
        if (denom <= 0) {
            percent = current >= target ? 100 : 0;
        } else {
            percent = ((current - start) / denom) * 100;
        }
    }

    return Math.min(Math.max(Math.round(percent), 0), 100);
};
