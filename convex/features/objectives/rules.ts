import { ConvexError, type Infer } from 'convex/values';
import { ERROR_CODES } from '../../shared/errorCodes';
import { DEFAULT_DUE_SOON_DAYS } from './constants';
import type { deadlineFilterValidator, objectiveDirectionValidator } from './validators';

export type ObjectiveDirection = Infer<typeof objectiveDirectionValidator>;

const HOUR_MS = 60 * 60 * 1000;

export const DAY_MS = 24 * HOUR_MS;

// Civil dates are the UTC midnight of the user's local day, and local time spans UTC-12 to UTC+14.
const EARLIEST_UTC_OFFSET_MS = 12 * HOUR_MS;

const LATEST_UTC_OFFSET_MS = 14 * HOUR_MS;

export function startOfUtcDay(timestamp: number) {
    return timestamp - (timestamp % DAY_MS);
}

function validateCivilDate(date: number) {
    if (!Number.isSafeInteger(date) || date % DAY_MS !== 0) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }
}

export function validateProgressDate(updateDate: number, now: number) {
    validateCivilDate(updateDate);

    if (updateDate > startOfUtcDay(now + LATEST_UTC_OFFSET_MS)) {
        throw new ConvexError(ERROR_CODES.FUTURE_DATE_NOT_ALLOWED);
    }
}

// The server doesn't know the user's time zone, so a deadline is "today" while that day is
// still current somewhere; the date picker applies the user's own day.
export function validateDeadline(deadline: number, now: number) {
    validateCivilDate(deadline);

    if (deadline < startOfUtcDay(now - EARLIEST_UTC_OFFSET_MS)) {
        throw new ConvexError(ERROR_CODES.DEADLINE_TOO_OLD);
    }
}

export function validateDueSoonDays(days: number) {
    if (!Number.isInteger(days) || days < 1) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }
}

// Without a deadline there is nothing to be due soon, so the setting is dropped with it.
export function dueSoonDaysFor(deadline: number | undefined, dueSoonDays: number | undefined) {
    if (deadline === undefined) {
        return undefined;
    }

    const days = dueSoonDays ?? DEFAULT_DUE_SOON_DAYS;
    validateDueSoonDays(days);

    return days;
}

/**
 * The [from, to) deadline range of a filter. `today` is the UTC midnight of the user's local day,
 * the same encoding as deadlines, so it has to come from the client.
 */
export function deadlineRange(
    filter: Infer<typeof deadlineFilterValidator>,
    today: number
): { from: number; to: number } {
    switch (filter) {
        case 'overdue':
            // Objectives without a deadline sort before every number, so they stay out.
            return { from: -Infinity, to: today };
        case 'today':
            return { from: today, to: today + DAY_MS };
        case 'week':
            return { from: today, to: today + 8 * DAY_MS };
        case 'month': {
            const date = new Date(today);

            return { from: today, to: Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1) };
        }
    }
}

export function validateMetric(value: number) {
    if (!Number.isFinite(value)) {
        throw new ConvexError(ERROR_CODES.VALUE_NOT_FINITE);
    }
}

export function validateProgressDifference(difference: number) {
    validateMetric(difference);

    if (difference === 0) {
        throw new ConvexError(ERROR_CODES.PROGRESS_ZERO);
    }
}

export function isTargetReached(
    direction: ObjectiveDirection,
    currentValue: number,
    targetValue: number
): boolean {
    return direction === 'increase' ? currentValue >= targetValue : currentValue <= targetValue;
}

export function validateObjectiveValues(
    direction: ObjectiveDirection,
    startValue: number,
    targetValue: number
) {
    validateMetric(startValue);

    if (!Number.isFinite(targetValue)) {
        throw new ConvexError(ERROR_CODES.TARGET_NOT_FINITE);
    }

    // An objective that starts at its target would be born completed with nothing to log.
    if (isTargetReached(direction, startValue, targetValue)) {
        throw new ConvexError(ERROR_CODES.TARGET_DIRECTION_MISMATCH);
    }
}
