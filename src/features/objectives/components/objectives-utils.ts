import type { Doc } from '@/convex/_generated/dataModel';
import type { Objective } from '@/features/objectives/schemas/objective';
import {
    directionSchema,
    objectiveTypeSchema,
    periodSchema,
    progressModeSchema,
    reminderIntervalSchema,
    savedObjectiveSchema,
} from '@/features/objectives/schemas/objective';

export const normalizeObjective = (objective: Doc<'objectives'>): Objective => {
    const objectiveType = objectiveTypeSchema.safeParse(objective.objectiveType).success
        ? objective.objectiveType
        : null;
    const period = periodSchema.safeParse(objective.period).success ? objective.period : null;
    const direction = directionSchema.safeParse(objective.direction).success
        ? objective.direction
        : null;
    const reminderInterval = reminderIntervalSchema.safeParse(objective.reminderInterval).success
        ? objective.reminderInterval
        : null;
    const progressMode = progressModeSchema.safeParse(objective.progressMode).success
        ? objective.progressMode
        : null;

    return savedObjectiveSchema.parse({
        _id: String(objective._id),
        title: objective.title,
        description: objective.description ?? null,
        category: objective.category ?? null,
        targetValue: objective.targetValue,
        currentValue: objective.currentValue,
        startValue: objective.startValue ?? null,
        deadline: objective.deadline ?? null,
        status: objective.status ?? null,
        unit: objective.unit ?? null,
        objectiveType,
        direction,
        period,
        periodStart: objective.periodStart ?? null,
        periodLengthDays: objective.periodLengthDays ?? null,
        reminderInterval,
        progressMode,
        collaborators: objective.collaborators ?? null,
    });
};

export const computeObjectiveProgressPercent = (objective: {
    currentValue: number;
    targetValue: number;
    startValue?: number | null;
    direction?: string | null;
}) => {
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

    return Math.min(Math.max(percent, 0), 100);
};
