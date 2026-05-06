import { describe, expect, test } from 'vitest';
import { ConvexError } from 'convex/values';
import {
    validateObjectiveMetrics,
    validateProgressDelta,
    validateUpdateDate,
    validateObjectiveNotCompleted,
} from '../utils/objectiveDomain';
import { ERROR_CODES } from '../utils/constants';

describe('objectiveDomain', () => {
    describe('validateObjectiveMetrics', () => {
        test('validateObjectiveMetrics accepts positive target', () => {
            expect(() =>
                validateObjectiveMetrics({
                    targetValue: 10,
                    currentValue: 0,
                    startValue: 0,
                })
            ).not.toThrow();
        });

        test('validateObjectiveMetrics accepts minimum valid target (0.001)', () => {
            expect(() =>
                validateObjectiveMetrics({
                    targetValue: 0.001,
                })
            ).not.toThrow();
        });

        test('validateObjectiveMetrics rejects target below minimum', () => {
            expect(() => validateObjectiveMetrics({ targetValue: 0 })).toThrow(ConvexError);
            try {
                validateObjectiveMetrics({ targetValue: 0 });
            } catch (e) {
                expect(e).toBeInstanceOf(ConvexError);
                if (e instanceof ConvexError) {
                    expect(e.data).toBe(ERROR_CODES.TARGET_TOO_SMALL);
                }
            }
        });

        test('validateObjectiveMetrics rejects NaN target', () => {
            expect(() =>
                validateObjectiveMetrics({
                    targetValue: Number.NaN,
                })
            ).toThrow(ConvexError);
            try {
                validateObjectiveMetrics({ targetValue: Number.NaN });
            } catch (e) {
                expect(e).toBeInstanceOf(ConvexError);
                if (e instanceof ConvexError) {
                    expect(e.data).toBe(ERROR_CODES.TARGET_NOT_FINITE);
                }
            }
        });

        test('validateObjectiveMetrics rejects infinite target', () => {
            expect(() =>
                validateObjectiveMetrics({
                    targetValue: Number.POSITIVE_INFINITY,
                })
            ).toThrow(ConvexError);
        });

        test('validateObjectiveMetrics rejects target exceeding maximum', () => {
            expect(() =>
                validateObjectiveMetrics({
                    targetValue: 1_000_000_001,
                })
            ).toThrow(ConvexError);
            try {
                validateObjectiveMetrics({ targetValue: 1_000_000_001 });
            } catch (e) {
                expect(e).toBeInstanceOf(ConvexError);
                if (e instanceof ConvexError) {
                    expect(e.data).toBe(ERROR_CODES.TARGET_TOO_LARGE);
                }
            }
        });

        test('validateObjectiveMetrics accepts maximum valid target', () => {
            expect(() =>
                validateObjectiveMetrics({
                    targetValue: 1_000_000_000,
                })
            ).not.toThrow();
        });
    });

    describe('validateProgressDelta', () => {
        test('validateProgressDelta rejects negative values', () => {
            expect(() => validateProgressDelta(-1)).toThrow(ConvexError);
            try {
                validateProgressDelta(-1);
            } catch (e) {
                expect(e).toBeInstanceOf(ConvexError);
                if (e instanceof ConvexError) {
                    expect(e.data).toBe(ERROR_CODES.VALUE_NEGATIVE);
                }
            }
        });

        test('validateProgressDelta accepts zero', () => {
            expect(() => validateProgressDelta(0)).not.toThrow();
        });

        test('validateProgressDelta accepts positive values', () => {
            expect(() => validateProgressDelta(100)).not.toThrow();
        });

        test('validateProgressDelta rejects NaN', () => {
            expect(() => validateProgressDelta(Number.NaN)).toThrow(ConvexError);
        });

        test('validateProgressDelta rejects infinite values', () => {
            expect(() => validateProgressDelta(Number.POSITIVE_INFINITY)).toThrow(ConvexError);
        });

        test('validateProgressDelta rejects values exceeding maximum', () => {
            expect(() => validateProgressDelta(1_000_000_001)).toThrow(ConvexError);
        });
    });

    describe('validateUpdateDate', () => {
        test('accepts current timestamp', () => {
            expect(() => validateUpdateDate(Date.now())).not.toThrow();
        });

        test('accepts past timestamp', () => {
            expect(() => validateUpdateDate(Date.now() - 86400000)).not.toThrow();
        });

        test('accepts timestamp within clock skew buffer (1 minute)', () => {
            expect(() => validateUpdateDate(Date.now() + 30000)).not.toThrow();
        });

        test('rejects future timestamp beyond buffer', () => {
            expect(() => validateUpdateDate(Date.now() + 120000)).toThrow(ConvexError);
            try {
                validateUpdateDate(Date.now() + 120000);
            } catch (e) {
                expect(e).toBeInstanceOf(ConvexError);
                if (e instanceof ConvexError) {
                    expect(e.data).toBe(ERROR_CODES.FUTURE_DATE_NOT_ALLOWED);
                }
            }
        });

        test('rejects timestamp too old (5+ years)', () => {
            const fiveYearsMs = 5 * 365 * 24 * 60 * 60 * 1000;
            expect(() => validateUpdateDate(Date.now() - fiveYearsMs - 86400000)).toThrow(
                ConvexError
            );
            try {
                validateUpdateDate(Date.now() - fiveYearsMs - 86400000);
            } catch (e) {
                expect(e).toBeInstanceOf(ConvexError);
                if (e instanceof ConvexError) {
                    expect(e.data).toBe(ERROR_CODES.DATE_TOO_OLD);
                }
            }
        });
    });

    describe('validateObjectiveNotCompleted', () => {
        test('throws when status is completed', () => {
            expect(() => validateObjectiveNotCompleted('completed')).toThrow(ConvexError);
            try {
                validateObjectiveNotCompleted('completed');
            } catch (e) {
                expect(e).toBeInstanceOf(ConvexError);
                if (e instanceof ConvexError) {
                    expect(e.data).toBe(ERROR_CODES.OBJECTIVE_ALREADY_COMPLETED);
                }
            }
        });

        test('does not throw for active status', () => {
            expect(() => validateObjectiveNotCompleted('active')).not.toThrow();
        });

        test('does not throw for other statuses', () => {
            expect(() => validateObjectiveNotCompleted('pending')).not.toThrow();
            expect(() => validateObjectiveNotCompleted('archived')).not.toThrow();
        });
    });
});
