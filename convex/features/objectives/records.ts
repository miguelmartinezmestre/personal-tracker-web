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

export /**
 * Totals are updated incrementally with binary floats, so sums such as 0.1 + 0.2 pick up
 * rounding noise that would otherwise accumulate across edits. A double holds 15 significant
 * digits exactly, so rounding there drops the noise without altering any entered value.
 */
function roundStoredValue(value: number): number {
    return Number(value.toPrecision(15));
}

// Flooring keeps an active objective below 100%, which only a reached target shows.
export function progressPercent(objective: {
    status: ObjectiveStatus;
    startValue: number;
    currentValue: number;
    targetValue: number;
}): number {
    if (objective.status === 'completed') {
        return 100;
    }

    // The target is always on the far side of the start, so the sign also covers decreasing ones.
    const ratio =
        (objective.currentValue - objective.startValue) /
        (objective.targetValue - objective.startValue);

    // Rounding the ratio first keeps float noise such as 28.999999999999996 from flooring a step.
    const percent = Math.floor(roundStoredValue(ratio * 100));

    return Math.min(Math.max(percent, 0), 100);
}

export function toObjectiveSummary(
    objective: Doc<'objectives'>,
    categoryName: string | undefined,
    access: ObjectiveAccess
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

// The most recent entries (newest first) as a chronological cumulative series.
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

// Reaching the target closes the objective for good, so only active objectives get here.
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

// An objective the actor cannot see is reported exactly like one that doesn't exist; one in the
// trash only exists for restoring or purging it.
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
                await objectiveAccess(db, actor, objective)
            )
        )
    );
}
