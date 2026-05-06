import type { Doc } from '@/convex/_generated/dataModel';
import type { Objective } from '@/features/objectives/schemas/objective';
import { savedObjectiveSchema } from '@/features/objectives/schemas/objective';

export const normalizeObjective = (objective: Doc<'objectives'>): Objective => {
    return savedObjectiveSchema.parse({
        _id: objective._id,
        title: objective.title,
        description: objective.description ?? null,
        categoryId: objective.categoryId ?? null,
        category: objective.category ?? null,
        targetValue: objective.targetValue,
        currentValue: objective.currentValue,
        startValue: objective.startValue ?? 0,
        deadline: objective.deadline ?? null,
        status: objective.status,
        scope: objective.scope,
        unit: objective.unit ?? null,
    });
};

export const computeObjectiveProgressPercent = (objective: {
    currentValue: number;
    targetValue: number;
    startValue?: number | null;
}) => {
    const current = objective.currentValue ?? 0;
    const target = objective.targetValue ?? 0;
    const start = objective.startValue ?? 0;
    const denominator = target - start;

    if (denominator <= 0) {
        return current >= target ? 100 : 0;
    }

    const percent = ((current - start) / denominator) * 100;
    return Math.min(Math.max(percent, 0), 100);
};
