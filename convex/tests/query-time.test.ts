import { ConvexError } from 'convex/values';
import { describe, expect, test, vi } from 'vitest';
import { assertValidReferenceTimestamp } from '../utils/queryTime';

describe('reference timestamp validation', () => {
    test('accepts a client clock skew within one day', () => {
        const now = Date.now();

        expect(() => assertValidReferenceTimestamp(now - 23 * 60 * 60 * 1000)).not.toThrow();
        expect(() => assertValidReferenceTimestamp(now + 23 * 60 * 60 * 1000)).not.toThrow();
    });

    test('rejects stale, far-future, and non-finite timestamps', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-07-14T12:00:00.000Z'));

        try {
            expect(() => assertValidReferenceTimestamp(Date.now() - 25 * 60 * 60 * 1000)).toThrow(
                ConvexError
            );
            expect(() => assertValidReferenceTimestamp(Date.now() + 25 * 60 * 60 * 1000)).toThrow(
                ConvexError
            );
            expect(() => assertValidReferenceTimestamp(Number.POSITIVE_INFINITY)).toThrow(
                ConvexError
            );
        } finally {
            vi.useRealTimers();
        }
    });
});
