import { ConvexError } from 'convex/values';
import type { Doc } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';
import { ERROR_CODES, OBJECTIVE_STATUS, TIME, type ObjectiveStatus } from '../../utils/constants';

const MAX_METRIC = 1_000_000_000;
const MIN_TARGET = 0.001;

function assertFiniteMetric(value: number | undefined): void {
    if (value === undefined) return;
    if (!Number.isFinite(value)) {
        throw new ConvexError(ERROR_CODES.VALUE_NOT_FINITE);
    }
    if (value < 0) {
        throw new ConvexError(ERROR_CODES.VALUE_NEGATIVE);
    }
    if (value > MAX_METRIC) {
        throw new ConvexError(ERROR_CODES.VALUE_TOO_LARGE);
    }
}

export function validateObjectiveMetrics(args: {
    targetValue?: number;
    currentValue?: number;
    startValue?: number;
    deadline?: number;
}): void {
    if (args.targetValue !== undefined) {
        if (!Number.isFinite(args.targetValue)) {
            throw new ConvexError(ERROR_CODES.TARGET_NOT_FINITE);
        }
        if (args.targetValue < MIN_TARGET) {
            throw new ConvexError(ERROR_CODES.TARGET_TOO_SMALL);
        }
        if (args.targetValue > MAX_METRIC) {
            throw new ConvexError(ERROR_CODES.TARGET_TOO_LARGE);
        }
    }
    assertFiniteMetric(args.currentValue);
    assertFiniteMetric(args.startValue);

    if (args.deadline !== undefined) {
        if (!Number.isFinite(args.deadline)) {
            throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
        }
        const now = Date.now();

        if (args.deadline < now - TIME.FIVE_YEARS_MS) {
            throw new ConvexError(ERROR_CODES.DEADLINE_TOO_OLD);
        }

        if (args.deadline > now + TIME.FIVE_YEARS_MS * 2) {
            throw new ConvexError(ERROR_CODES.DEADLINE_TOO_FAR);
        }
    }
}

export function validateProgressDelta(updatedValue: number): void {
    if (!Number.isFinite(updatedValue)) {
        throw new ConvexError(ERROR_CODES.VALUE_NOT_FINITE);
    }
    if (updatedValue < 0) {
        throw new ConvexError(ERROR_CODES.VALUE_NEGATIVE);
    }
    if (updatedValue > MAX_METRIC) {
        throw new ConvexError(ERROR_CODES.VALUE_TOO_LARGE);
    }
}

export function validateUpdateDate(updateDate: number): void {
    const now = Date.now();

    if (updateDate > now + TIME.MINUTE_MS) {
        throw new ConvexError(ERROR_CODES.FUTURE_DATE_NOT_ALLOWED);
    }

    if (updateDate < now - TIME.FIVE_YEARS_MS) {
        throw new ConvexError(ERROR_CODES.DATE_TOO_OLD);
    }
}

export function validateObjectiveNotCompleted(status: ObjectiveStatus): void {
    if (status === OBJECTIVE_STATUS.COMPLETED) {
        throw new ConvexError(ERROR_CODES.OBJECTIVE_ALREADY_COMPLETED);
    }

    if (status !== OBJECTIVE_STATUS.ACTIVE) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }
}

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

export async function recomputeObjectiveFromProgress(
    ctx: MutationCtx,
    objective: Doc<'objectives'>
): Promise<{ currentValue: number; status: 'active' | 'completed'; completedNow: boolean }> {
    const baseValue = objective.startValue ?? 0;

    let progressTotal = 0;
    let cursor: string | null = null;
    let isDone = false;
    let updateCount = 0;
    const PAGINATION_BATCH_SIZE = 500;
    const MAX_UPDATES = 10000;

    while (!isDone && updateCount < MAX_UPDATES) {
        const page = await ctx.db
            .query('progressUpdates')
            .withIndex('by_objective', q => q.eq('objective', objective._id))
            .paginate({ numItems: PAGINATION_BATCH_SIZE, cursor: cursor ?? null });

        for (const update of page.page) {
            progressTotal += update.updatedValue;
        }

        updateCount += page.page.length;
        isDone = page.isDone;
        cursor = page.continueCursor;
    }

    const currentValue = baseValue + progressTotal;
    const status = currentValue >= objective.targetValue ? 'completed' : 'active';
    const completedNow = objective.status !== 'completed' && status === 'completed';

    await ctx.db.patch('objectives', objective._id, {
        currentValue,
        status,
        updatedAt: Date.now(),
    });

    return { currentValue, status, completedNow };
}
