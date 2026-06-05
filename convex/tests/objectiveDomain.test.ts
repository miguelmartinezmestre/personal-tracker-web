import { describe, expect, test } from 'vitest';
import { ConvexError } from 'convex/values';
import {
    applyObjectiveProgressDelta,
    validateObjectiveMetrics,
    validateProgressDelta,
    validateUpdateDate,
    validateObjectiveNotCompleted,
} from '../domain/objectives/metrics';
import { isEarlyBirdCompletion } from '../domain/achievements/calculations';
import { ERROR_CODES } from '../utils/constants';
import { initConvexTest } from './test.helper';
import { createTestOrganization, createTestUser } from './test_helpers';
import type { Id } from '../_generated/dataModel';

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
            expect(() => validateProgressDelta(-1, 0)).toThrow(ConvexError);
            try {
                validateProgressDelta(-1, 0);
            } catch (e) {
                expect(e).toBeInstanceOf(ConvexError);
                if (e instanceof ConvexError) {
                    expect(e.data).toBe(ERROR_CODES.VALUE_NEGATIVE);
                }
            }
        });

        test('validateProgressDelta accepts zero', () => {
            expect(() => validateProgressDelta(0, 0)).not.toThrow();
        });

        test('validateProgressDelta accepts positive values', () => {
            expect(() => validateProgressDelta(100, 0)).not.toThrow();
        });

        test('validateProgressDelta rejects NaN', () => {
            expect(() => validateProgressDelta(Number.NaN, 0)).toThrow(ConvexError);
        });

        test('validateProgressDelta rejects infinite values', () => {
            expect(() => validateProgressDelta(Number.POSITIVE_INFINITY, 0)).toThrow(ConvexError);
        });

        test('validateProgressDelta rejects values exceeding maximum', () => {
            expect(() => validateProgressDelta(1_000_000_001, 0)).toThrow(ConvexError);
        });

        test('validateProgressDelta rejects currentValue + delta exceeding maximum', () => {
            expect(() => validateProgressDelta(1, 1_000_000_000)).toThrow(ConvexError);
        });
    });

    describe('validateUpdateDate', () => {
        test('accepts current timestamp', () => {
            expect(() => validateUpdateDate(Date.now())).not.toThrow();
        });

        test('accepts past timestamp within 1 day', () => {
            expect(() => validateUpdateDate(Date.now() - 86400000)).not.toThrow();
        });

        test('accepts timestamp within clock skew buffer (1 minute)', () => {
            expect(() => validateUpdateDate(Date.now() + 30000)).not.toThrow();
        });

        test('rejects future timestamp beyond 1 day', () => {
            expect(() => validateUpdateDate(Date.now() + 2 * 86400000)).toThrow(ConvexError);
            try {
                validateUpdateDate(Date.now() + 2 * 86400000);
            } catch (e) {
                expect(e).toBeInstanceOf(ConvexError);
                if (e instanceof ConvexError) {
                    expect(e.data).toBe(ERROR_CODES.FUTURE_DATE_NOT_ALLOWED);
                }
            }
        });

        test('rejects timestamp too old (more than 1 day)', () => {
            expect(() => validateUpdateDate(Date.now() - 2 * 86400000)).toThrow(ConvexError);
            try {
                validateUpdateDate(Date.now() - 2 * 86400000);
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

        test.each(['pending', 'archived'])('throws for unsupported status: %s', status => {
            expect(() => validateObjectiveNotCompleted(status as never)).toThrow(ConvexError);
            try {
                validateObjectiveNotCompleted(status as never);
            } catch (e) {
                expect(e).toBeInstanceOf(ConvexError);
                if (e instanceof ConvexError) {
                    expect(e.data).toBe(ERROR_CODES.VALIDATION_ERROR);
                }
            }
        });
    });

    describe('isEarlyBirdCompletion', () => {
        test('returns true when completed before deadline', () => {
            expect(
                isEarlyBirdCompletion({
                    status: 'completed',
                    deadline: 2000,
                    completedAt: 1000,
                })
            ).toBe(true);
        });

        test('returns false when completed after deadline', () => {
            expect(
                isEarlyBirdCompletion({
                    status: 'completed',
                    deadline: 1000,
                    completedAt: 2000,
                })
            ).toBe(false);
        });

        test('returns false without completedAt', () => {
            expect(
                isEarlyBirdCompletion({
                    status: 'completed',
                    deadline: 2000,
                })
            ).toBe(false);
        });
    });

    describe('applyObjectiveProgressDelta', () => {
        const t = initConvexTest();

        test('sets completedAt when objective completes', async () => {
            const userData = await createTestUser(t, {
                userId: 'metrics-user',
                email: 'metrics@test.com',
                name: 'Metrics User',
                password: 'test',
                role: 'globalAdmin',
                emailVerified: false,
            });
            const organizationId = await createTestOrganization(t, {
                name: 'Metrics Org',
                slug: 'metrics-org',
            });

            await t.run(async ctx => {
                const objectiveId = await ctx.db.insert('objectives', {
                    userId: userData.docId,
                    organizationId,
                    title: 'Complete Me',
                    targetValue: 100,
                    currentValue: 50,
                    startValue: 0,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });

                await applyObjectiveProgressDelta(ctx, objectiveId, 50);

                const objective = await ctx.db.get('objectives', objectiveId);
                expect(objective?.status).toBe('completed');
                expect(objective?.completedAt).toBeDefined();
            });
        });

        test('clears completedAt when objective reopens', async () => {
            const userData = await createTestUser(t, {
                userId: 'reopen-user',
                email: 'reopen@test.com',
                name: 'Reopen User',
                password: 'test',
                role: 'globalAdmin',
                emailVerified: false,
            });
            const organizationId = await createTestOrganization(t, {
                name: 'Reopen Org',
                slug: 'reopen-org',
            });

            await t.run(async ctx => {
                const objectiveId = await ctx.db.insert('objectives', {
                    userId: userData.docId as Id<'user'>,
                    organizationId,
                    title: 'Reopen Me',
                    targetValue: 100,
                    currentValue: 100,
                    startValue: 0,
                    status: 'completed',
                    completedAt: Date.now(),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });

                await applyObjectiveProgressDelta(ctx, objectiveId, -50);

                const objective = await ctx.db.get('objectives', objectiveId);
                expect(objective?.status).toBe('active');
                expect(objective?.completedAt).toBeUndefined();
            });
        });
    });
});
