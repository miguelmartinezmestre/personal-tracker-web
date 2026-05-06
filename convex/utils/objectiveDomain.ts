import { ConvexError } from 'convex/values';
import { ERROR_CODES, TIME } from './constants';


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


export function validateObjectiveNotCompleted(status: string): void {
    if (status === 'completed') {
        throw new ConvexError(ERROR_CODES.OBJECTIVE_ALREADY_COMPLETED);
    }
}
