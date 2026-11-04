import { ConvexError } from 'convex/values';
import type { Doc, Id } from '../../_generated/dataModel';
import { ERROR_CODES } from '../../shared/errorCodes';
import { isTargetReached, validateMetric, type ObjectiveDirection } from './rules';
import type { QueryCtx } from '../../_generated/server';
import {
    memberAccessLevel,
    objectiveAccess,
    type AccessActor,
    type ObjectiveAccess,
} from './access';

type ObjectiveStatus = 'active' | 'completed';

export function requireOrganizationId(
    organizationId: Id<'organization'> | null | undefined
): Id<'organization'> {
    if (!organizationId) {
        throw new ConvexError(ERROR_CODES.NO_ACTIVE_ORG);
    }

    return organizationId;
}

// Incremental float totals gather noise (0.1 + 0.2); 15 digits drop it and keep every input.
export function roundStoredValue(value: number): number {
    return Number(value.toPrecision(15));
}

export function progressPercent(objective: {
    status: ObjectiveStatus;
    startValue: number;
    currentValue: number;
    targetValue: number;
}): number {
    if (objective.status === 'completed') {
        return 100;
    }

    const ratio =
        (objective.currentValue - objective.startValue) /
        (objective.targetValue - objective.startValue);

    const percent = Math.floor(roundStoredValue(ratio * 100));

    return Math.min(Math.max(percent, 0), 100);
}

export async function firstProgressAt(
    db: QueryCtx['db'],
    objectiveId: Id<'objectives'>
): Promise<number | undefined> {
    const first = await db
        .query('progressUpdates')
        .withIndex('by_objective_date', q => q.eq('objective', objectiveId))
        .first();

    return first?.updateDate;
}

export function toObjectiveSummary(
    objective: Doc<'objectives'>,
    categoryName: string | undefined,
    access: ObjectiveAccess,
    firstProgressDate: number | undefined
) {
    return {
        id: objective._id,
        title: objective.title,
        description: objective.description,
        categoryId: objective.categoryId,
        categoryName,
        unit: objective.unit,
        deadline: objective.deadline,
        dueSoonDays: objective.dueSoonDays,
        direction: objective.direction,
        startValue: objective.startValue,
        currentValue: objective.currentValue,
        targetValue: objective.targetValue,
        status: objective.status,
        completedAt: objective.completedAt,
        deletedAt: objective.deletedAt,
        progressPercent: progressPercent(objective),
        createdAt: objective.createdAt,
        firstProgressAt: firstProgressDate,
        updatedAt: objective.updatedAt,
        memberAccess: memberAccessLevel(objective),
        canEdit: access.canEdit,
        canManage: access.canManage,
    };
}

export function toProgressEntry(entry: Doc<'progressUpdates'>, canEdit: boolean) {
    return {
        id: entry._id,
        objectiveId: entry.objective,
        updatedValue: entry.updatedValue,
        updateDate: entry.updateDate,
        resultingValue: entry.resultingValue,
        comment: entry.comment,
        createdAt: entry.createdAt,
        canEdit,
    };
}

export function progressHistoryPoints(newestFirst: readonly Doc<'progressUpdates'>[]) {
    return newestFirst
        .map(entry => ({
            id: entry._id,
            updateDate: entry.updateDate,
            value: entry.resultingValue,
            delta: entry.updatedValue,
            comment: entry.comment,
        }))
        .reverse();
}

function optionalText(value: string | null | undefined): string | undefined {
    return value?.trim() || undefined;
}

export function objectiveTextFields(input: { title: string; description?: string; unit?: string }) {
    const title = input.title.trim();

    if (!title) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }

    return {
        title,
        description: optionalText(input.description),
        unit: optionalText(input.unit),
    };
}

export function resolvedObjectiveFields(
    existing: Doc<'objectives'>,
    args: {
        title?: string;
        description?: string | null;
        unit?: string | null;
        categoryId?: Id<'categories'> | null;
        deadline?: number | null;
        dueSoonDays?: number;
        direction?: ObjectiveDirection;
        startValue?: number;
        targetValue?: number;
    }
) {
    const title = args.title === undefined ? existing.title : args.title.trim();

    if (!title) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }

    const description =
        args.description === undefined ? existing.description : optionalText(args.description);

    const unit = args.unit === undefined ? existing.unit : optionalText(args.unit);

    let categoryId = existing.categoryId;

    if (args.categoryId !== undefined) {
        categoryId = args.categoryId ?? undefined;
    }

    let deadline = existing.deadline;

    if (args.deadline !== undefined) {
        deadline = args.deadline ?? undefined;
    }

    return {
        title,
        description,
        unit,
        categoryId,
        deadline,
        dueSoonDays: args.dueSoonDays ?? existing.dueSoonDays,
        direction: args.direction ?? existing.direction,
        startValue: args.startValue ?? existing.startValue,
        targetValue: args.targetValue ?? existing.targetValue,
    };
}

export function measurement(
    objective: { direction: ObjectiveDirection; targetValue: number },
    currentValue: number,
    now: number
): { currentValue: number; status: ObjectiveStatus; completedAt: number | undefined } {
    validateMetric(currentValue);

    if (isTargetReached(objective.direction, currentValue, objective.targetValue)) {
        return { currentValue, status: 'completed', completedAt: now };
    }

    return { currentValue, status: 'active', completedAt: undefined };
}

export function progressComment(value: string | null | undefined): string | undefined {
    return optionalText(value);
}

export async function requireObjective(
    db: QueryCtx['db'],
    actor: AccessActor,
    objectiveId: Id<'objectives'>,
    { inTrash = false } = {}
): Promise<{ objective: Doc<'objectives'>; access: ObjectiveAccess }> {
    const objective = await db.get('objectives', objectiveId);
    const access = objective && (await objectiveAccess(db, actor, objective));

    if (!objective || !access?.canView || (objective.deletedAt !== undefined) !== inTrash) {
        throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
    }

    return { objective, access };
}

export async function validateCategory(
    db: QueryCtx['db'],
    categoryId: Id<'categories'> | undefined,
    organizationId: Id<'organization'>
) {
    if (categoryId && (await db.get('categories', categoryId))?.organizationId !== organizationId) {
        throw new ConvexError(ERROR_CODES.CATEGORY_NOT_FOUND);
    }
}

export async function toObjectiveSummaries(
    db: QueryCtx['db'],
    actor: AccessActor,
    objectives: Doc<'objectives'>[]
) {
    const categoryNames = new Map<Id<'categories'>, string>();

    for (const objective of objectives) {
        if (objective.categoryId && !categoryNames.has(objective.categoryId)) {
            const category = await db.get('categories', objective.categoryId);

            if (category) {
                categoryNames.set(objective.categoryId, category.name);
            }
        }
    }

    return await Promise.all(
        objectives.map(async objective =>
            toObjectiveSummary(
                objective,
                objective.categoryId ? categoryNames.get(objective.categoryId) : undefined,
                await objectiveAccess(db, actor, objective),
                await firstProgressAt(db, objective._id)
            )
        )
    );
}
