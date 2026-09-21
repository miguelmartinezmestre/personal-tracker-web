import { ConvexError } from 'convex/values';
import { ERROR_CODES } from './constants';

const MIN_REFERENCE_TIMESTAMP = Date.UTC(2020, 0, 1);
const MAX_REFERENCE_CLOCK_SKEW_MS = 24 * 60 * 60 * 1000;

export function assertValidReferenceTimestamp(now: number): void {
    if (
        !Number.isFinite(now) ||
        now < MIN_REFERENCE_TIMESTAMP ||
        Math.abs(now - Date.now()) > MAX_REFERENCE_CLOCK_SKEW_MS
    ) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }
}

export function assertBoundedInteger(value: number, bounds: { min: number; max: number }): number {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }
    if (value < bounds.min || value > bounds.max) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }
    return value;
}

export function isInvitationActive(invitation: { status: string; expiresAt: number }, now: number) {
    return invitation.status === 'pending' && invitation.expiresAt > now;
}
