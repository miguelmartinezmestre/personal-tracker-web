import type { Doc } from '../_generated/dataModel';

export type ProgressMode = 'cumulative' | 'snapshot';

export const resolveProgressMode = (mode?: string | null): ProgressMode => {
    return mode === 'snapshot' ? 'snapshot' : 'cumulative';
};

export const computeCurrentValue = (
    objective: Pick<Doc<'objectives'>, 'progressMode' | 'startValue' | 'currentValue'>,
    updates: { updatedValue: number; updateDate: number }[]
): number => {
    const mode = resolveProgressMode(objective.progressMode);

    if (mode === 'snapshot') {
        if (updates.length === 0) {
            return objective.startValue ?? objective.currentValue ?? 0;
        }
        const latest = updates.reduce((acc, update) =>
            update.updateDate > acc.updateDate ? update : acc
        );
        return latest.updatedValue;
    }

    const base = objective.startValue ?? 0;
    if (updates.length === 0) {
        return base;
    }
    const total = updates.reduce((sum, update) => sum + update.updatedValue, 0);
    return base + total;
};

export const computeLastProgressAt = (updates: { updateDate: number }[]): number | undefined => {
    if (updates.length === 0) return undefined;
    return updates.reduce((max, update) => (update.updateDate > max ? update.updateDate : max), 0);
};
