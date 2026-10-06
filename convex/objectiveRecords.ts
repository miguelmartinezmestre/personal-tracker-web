import { ConvexError } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import {
    ERROR_CODES,
    OBJECTIVE_DESCRIPTION_MAX_LENGTH,
    OBJECTIVE_TITLE_MAX_LENGTH,
    OBJECTIVE_UNIT_MAX_LENGTH,
    PROGRESS_COMMENT_MAX_LENGTH,
} from './constants';
import { isGlobalAdminRole, isOrganizationAdminRole } from './utils';

export type ObjectiveActor = {
    organizationId?: Id<'organization'> | null;
    userId: Id<'user'>;
    role?: string | null;
    memberRole?: string | null;
};

type ObjectiveStatus = 'active' | 'completed';

export function requireOrganizationId(
    organizationId: Id<'organization'> | null | undefined
): Id<'organization'> {
    if (!organizationId) {
        throw new ConvexError(ERROR_CODES.NO_ACTIVE_ORG);
    }
    return organizationId;
}

/**
 * Totals are updated incrementally with binary floats, so sums such as 0.1 + 0.2 pick up
 * rounding noise that would otherwise accumulate across edits. A double holds 15 significant
 * digits exactly, so rounding there drops the noise without altering any entered value.
 */
export function roundStoredValue(value: number): number {
    return Number(value.toPrecision(15));
}

export function progressPercent(objective: {
    startValue: number;
    currentValue: number;
    targetValue: number;
}): number {
    const denominator = objective.targetValue - objective.startValue;
    if (denominator <= 0) {
        if (objective.currentValue >= objective.targetValue) {
            return 100;
        }
        return 0;
    }
    const percent = ((objective.currentValue - objective.startValue) / denominator) * 100;
    return Math.min(Math.max(Math.round(percent), 0), 100);
}

export function canManageObjective(
    actor: ObjectiveActor,
    objective: { organizationId: Id<'organization'>; createdBy: Id<'user'> }
): boolean {
    return (
        objective.organizationId === actor.organizationId &&
        (isGlobalAdminRole(actor.role) ||
            objective.createdBy === actor.userId ||
            isOrganizationAdminRole(actor.memberRole))
    );
}

export function assertCanManageObjective(
    actor: ObjectiveActor,
    objective: { organizationId: Id<'organization'>; createdBy: Id<'user'> }
): void {
    if (!canManageObjective(actor, objective)) {
        throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_OBJECTIVE);
    }
}

export function assertCanEditProgress(
    actor: ObjectiveActor,
    entry: { createdBy: Id<'user'> },
    objective: { organizationId: Id<'organization'>; createdBy: Id<'user'> }
): void {
    if (entry.createdBy === actor.userId || canManageObjective(actor, objective)) {
        return;
    }
    throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_PROGRESS);
}

export function toObjectiveSummary(
    objective: Doc<'objectives'>,
    categoryName: string | undefined,
    actor: ObjectiveActor
) {
    return {
        id: objective._id,
        title: objective.title,
        ...(objective.description !== undefined ? { description: objective.description } : {}),
        ...(objective.categoryId !== undefined ? { categoryId: objective.categoryId } : {}),
        ...(categoryName !== undefined ? { categoryName } : {}),
        ...(objective.unit !== undefined ? { unit: objective.unit } : {}),
        ...(objective.deadline !== undefined ? { deadline: objective.deadline } : {}),
        startValue: objective.startValue,
        currentValue: objective.currentValue,
        targetValue: objective.targetValue,
        status: objective.status,
        ...(objective.completedAt !== undefined ? { completedAt: objective.completedAt } : {}),
        progressPercent: progressPercent(objective),
        createdAt: objective.createdAt,
        updatedAt: objective.updatedAt,
        canManage: canManageObjective(actor, objective),
    };
}

export function toProgressEntry(entry: Doc<'progressUpdates'>, canEdit: boolean) {
    return {
        id: entry._id,
        objectiveId: entry.objective,
        updatedValue: entry.updatedValue,
        updateDate: entry.updateDate,
        ...(entry.comment !== undefined ? { comment: entry.comment } : {}),
        createdAt: entry.createdAt,
        canEdit,
    };
}

/**
 * Converts the most recent progress entries (newest first) into a chronological cumulative
 * series. Entries store increments, so each value is reconstructed backwards from the
 * objective's current total; this stays exact when older entries are not included.
 */
export function progressHistoryPoints(
    objective: { currentValue: number },
    newestFirst: readonly Doc<'progressUpdates'>[]
) {
    let value = objective.currentValue;
    const points = newestFirst.map(entry => {
        const point = {
            id: entry._id,
            updateDate: entry.updateDate,
            value,
            delta: entry.updatedValue,
            ...(entry.comment !== undefined ? { comment: entry.comment } : {}),
        };
        value = roundStoredValue(value - entry.updatedValue);
        return point;
    });
    return points.reverse();
}

function optionalBoundedText(
    value: string | null | undefined,
    maxLength: number
): string | undefined {
    const text = value?.trim();
    if (text && text.length > maxLength) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }
    if (!text) {
        return undefined;
    }
    return text;
}

export function objectiveTextFields(input: {
    title: string;
    description?: string;
    unit?: string;
}): {
    title: string;
    description: string | undefined;
    unit: string | undefined;
} {
    const title = input.title.trim();
    if (!title || title.length > OBJECTIVE_TITLE_MAX_LENGTH) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }
    return {
        title,
        description: optionalBoundedText(input.description, OBJECTIVE_DESCRIPTION_MAX_LENGTH),
        unit: optionalBoundedText(input.unit, OBJECTIVE_UNIT_MAX_LENGTH),
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
        startValue?: number;
        targetValue?: number;
    }
) {
    const title = args.title === undefined ? existing.title : args.title.trim();
    if (!title || title.length > OBJECTIVE_TITLE_MAX_LENGTH) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }
    const description =
        args.description === undefined
            ? existing.description
            : optionalBoundedText(args.description, OBJECTIVE_DESCRIPTION_MAX_LENGTH);
    const unit =
        args.unit === undefined
            ? existing.unit
            : optionalBoundedText(args.unit, OBJECTIVE_UNIT_MAX_LENGTH);
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
        startValue: args.startValue ?? existing.startValue,
        targetValue: args.targetValue ?? existing.targetValue,
    };
}

export function completedAtWhenFinished(
    status: ObjectiveStatus,
    now: number,
    previous: { status: ObjectiveStatus; completedAt?: number }
): number | undefined {
    if (status !== 'completed') {
        return undefined;
    }
    if (previous.status === 'completed') {
        return previous.completedAt;
    }
    return now;
}

export function measurementAfterBoundsChange(
    existing: Doc<'objectives'>,
    startValue: number,
    targetValue: number,
    now: number
): { currentValue: number; status: ObjectiveStatus; completedAt: number | undefined } | null {
    if (startValue === existing.startValue && targetValue === existing.targetValue) {
        return null;
    }
    let currentValue = existing.currentValue;
    if (startValue !== existing.startValue) {
        currentValue = roundStoredValue(
            Math.max(startValue, existing.currentValue - existing.startValue + startValue)
        );
    }
    if (!Number.isFinite(currentValue)) {
        throw new ConvexError(ERROR_CODES.VALUE_TOO_LARGE);
    }
    const status: ObjectiveStatus = currentValue >= targetValue ? 'completed' : 'active';
    return {
        currentValue,
        status,
        completedAt: completedAtWhenFinished(status, now, existing),
    };
}

export function progressComment(value: string | null | undefined): string | undefined {
    return optionalBoundedText(value, PROGRESS_COMMENT_MAX_LENGTH);
}

export function currentValueAfterProgressChange(
    objective: { startValue: number; currentValue: number },
    previousUpdatedValue: number | null,
    nextUpdatedValue: number
): number {
    let currentValue = objective.currentValue;
    if (previousUpdatedValue === null) {
        currentValue = roundStoredValue(
            Math.max(objective.startValue, objective.currentValue + nextUpdatedValue)
        );
    } else if (nextUpdatedValue !== previousUpdatedValue) {
        currentValue = roundStoredValue(
            Math.max(
                objective.startValue,
                objective.currentValue - previousUpdatedValue + nextUpdatedValue
            )
        );
    }
    if (!Number.isFinite(currentValue)) {
        throw new ConvexError(ERROR_CODES.VALUE_TOO_LARGE);
    }
    return currentValue;
}
