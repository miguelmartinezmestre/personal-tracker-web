import type { Doc } from '@/convex/_generated/dataModel';
import type { Objective } from '@/features/objectives/schemas/objective';
import {
    objectiveTypeSchema,
    periodSchema,
    savedObjectiveSchema,
} from '@/features/objectives/schemas/objective';

const DEFAULT_PAGE_SIZE = 20;

export interface CreateObjectiveParams {
    title: string;
    targetValue: number;
    currentValue: number;
    description?: string | null;
    category?: string | null;
    deadline?: number | null;
    status?: string | null;
    unit?: string | null;
    objectiveType?: string | null;
    period?: string | null;
    periodStart?: number | null;
    periodLengthDays?: number | null;
}

export interface UpdateObjectiveParams {
    id: string;
    title?: string;
    description?: string | null;
    category?: string | null;
    targetValue?: number;
    currentValue?: number;
    deadline?: number | null;
    status?: string | null;
    unit?: string | null;
    objectiveType?: string | null;
    period?: string | null;
    periodStart?: number | null;
    periodLengthDays?: number | null;
}

export const normalizeObjective = (objective: Doc<'objectives'>): Objective => {
    const objectiveType = objectiveTypeSchema.safeParse(objective.objectiveType).success
        ? objective.objectiveType
        : null;
    const period = periodSchema.safeParse(objective.period).success ? objective.period : null;

    return savedObjectiveSchema.parse({
        _id: String(objective._id),
        title: objective.title,
        description: objective.description ?? null,
        category: objective.category ?? null,
        targetValue: objective.targetValue,
        currentValue: objective.currentValue,
        deadline: objective.deadline ?? null,
        status: objective.status ?? null,
        unit: objective.unit ?? null,
        objectiveType,
        period,
        periodStart: objective.periodStart ?? null,
        periodLengthDays: objective.periodLengthDays ?? null,
    });
};

export const OBJECTIVES_DEFAULT_PAGE_SIZE = DEFAULT_PAGE_SIZE;
