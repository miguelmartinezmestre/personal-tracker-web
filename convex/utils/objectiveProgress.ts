import type { Doc } from '../_generated/dataModel';

export const computeCurrentValue = (
  objective: Pick<Doc<'objectives'>, 'startValue'>,
  updates: { updatedValue: number; updateDate: number }[]
): number => {
  const base = objective.startValue ?? 0;
  const total = updates.reduce((sum, update) => sum + update.updatedValue, 0);
  return base + total;
};

export const computeLastProgressAt = (updates: { updateDate: number }[]): number | undefined => {
  if (updates.length === 0) return undefined;
  return updates.reduce((max, update) => (update.updateDate > max ? update.updateDate : max), 0);
};

export const computeProgressPercent = (objective: {
  currentValue: number;
  targetValue: number;
  startValue?: number | null;
}): number => {
  const current = objective.currentValue ?? 0;
  const target = objective.targetValue ?? 0;
  const start = objective.startValue ?? 0;
  const denominator = target - start;

  if (denominator <= 0) {
    return current >= target ? 100 : 0;
  }

  const percent = ((current - start) / denominator) * 100;
  return Math.min(Math.max(Math.round(percent), 0), 100);
};
