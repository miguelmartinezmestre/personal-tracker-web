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
import { ERROR_CODES, type ObjectiveStatus } from '../utils/constants';
import { CIVIL_DAY_MS, currentUtcCivilDay, toUtcCivilDay } from '../../shared/civil-date';
import { initConvexTest } from './test.helper';
import { createTestOrganization, createTestUser } from './test_helpers';
import { asInvalidArg } from './testCasts';

describe('objectiveDomain', () => {
    describe('validateObjectiveMetrics', () => {
        test('accepts representative valid metric bounds', () => {
            expect(() =>
                validateObjectiveMetrics({
                    targetValue: 0.001,
                    currentValue: 1_000_000_000,
                    startValue: 0,
                })
            ).not.toThrow();
        });

        test('rejects representative invalid target values with domain errors', () => {
            expect(() => validateObjectiveMetrics({ targetValue: 0 })).toThrow(ConvexError);
            expect(() => validateObjectiveMetrics({ targetValue: Number.NaN })).toThrow(
                ConvexError
            );
            expect(() => validateObjectiveMetrics({ targetValue: 1_000_000_001 })).toThrow(
                ConvexError
            );

            try {
                validateObjectiveMetrics({ targetValue: 0 });
            } catch (e) {
                expect(e).toBeInstanceOf(ConvexError);
                if (e instanceof ConvexError) {
                    expect(e.data).toBe(ERROR_CODES.TARGET_TOO_SMALL);
                }
            }
        });

        test('rejects representative invalid current values', () => {
            expect(() => validateObjectiveMetrics({ currentValue: -1 })).toThrow(ConvexError);
            expect(() =>
                validateObjectiveMetrics({ currentValue: Number.POSITIVE_INFINITY })
            ).toThrow(ConvexError);
            expect(() => validateObjectiveMetrics({ currentValue: 1_000_000_001 })).toThrow(
                ConvexError
            );
        });
    });

    describe('validateProgressDelta', () => {
        test('accepts zero and positive progress deltas', () => {
            expect(() => validateProgressDelta(0, 0)).not.toThrow();
            expect(() => validateProgressDelta(100, 0)).not.toThrow();
        });

        test('rejects invalid progress deltas and overflow', () => {
            expect(() => validateProgressDelta(-1, 0)).toThrow(ConvexError);
            expect(() => validateProgressDelta(Number.NaN, 0)).toThrow(ConvexError);
            expect(() => validateProgressDelta(1_000_000_001, 0)).toThrow(ConvexError);
            expect(() => validateProgressDelta(1, 1_000_000_000)).toThrow(ConvexError);

            try {
                validateProgressDelta(-1, 0);
            } catch (e) {
                expect(e).toBeInstanceOf(ConvexError);
                if (e instanceof ConvexError) {
                    expect(e.data).toBe(ERROR_CODES.VALUE_NEGATIVE);
                }
            }
        });
    });

    describe('validateUpdateDate', () => {
        test('accepts current-day timestamps and recent past dates', () => {
            const now = Date.now();
            expect(() => validateUpdateDate(now)).not.toThrow();
            expect(() => validateUpdateDate(Date.now() - 86400000)).not.toThrow();
            expect(() =>
                validateUpdateDate(currentUtcCivilDay(now) + CIVIL_DAY_MS - 1)
            ).not.toThrow();
        });

        test('rejects dates too far in the future or past', () => {
            expect(() => validateUpdateDate(currentUtcCivilDay() + CIVIL_DAY_MS)).toThrow(
                ConvexError
            );
            expect(() => validateUpdateDate(Date.now() - 5 * 365 * 86400000 - 86400000)).toThrow(
                ConvexError
            );
        });

        test('normalizes timestamps to their UTC civil-day key', () => {
            const timestamp = Date.UTC(2026, 6, 14, 19, 42, 10);
            expect(toUtcCivilDay(timestamp)).toBe(Date.UTC(2026, 6, 14));
        });
    });

    describe('validateObjectiveNotCompleted', () => {
        test('accepts active objectives and rejects completed ones', () => {
            expect(() => validateObjectiveNotCompleted('active')).not.toThrow();
            expect(() => validateObjectiveNotCompleted('completed')).toThrow(ConvexError);
        });

        test('rejects unsupported statuses', () => {
            expect(() =>
                validateObjectiveNotCompleted(asInvalidArg<ObjectiveStatus>('archived'))
            ).toThrow(ConvexError);
        });
    });

    test('isEarlyBirdCompletion reflects deadline timing', () => {
        const deadline = Date.UTC(2026, 6, 14);
        expect(
            isEarlyBirdCompletion({
                status: 'completed',
                deadline,
                completedAt: deadline + CIVIL_DAY_MS - 1,
            })
        ).toBe(true);
        expect(
            isEarlyBirdCompletion({
                status: 'completed',
                deadline,
                completedAt: deadline + CIVIL_DAY_MS,
            })
        ).toBe(false);
        expect(
            isEarlyBirdCompletion({
                status: 'completed',
                deadline,
            })
        ).toBe(false);
    });

    describe('applyObjectiveProgressDelta', () => {
        const t = initConvexTest();

        async function insertObjective(status: 'active' | 'completed') {
            const suffix = Math.random().toString(36).slice(2);
            const userData = await createTestUser(t, {
                userId: `metrics-user-${suffix}`,
                email: `metrics-${suffix}@test.com`,
                name: 'Metrics User',
                password: 'test',
                role: 'globalAdmin',
                emailVerified: false,
            });
            const organizationId = await createTestOrganization(t, {
                name: `Metrics Org ${suffix}`,
                slug: `metrics-org-${suffix}`,
            });

            return await t.run(async ctx => {
                return await ctx.db.insert('objectives', {
                    createdBy: userData.docId,
                    ownerId: userData.docId,
                    visibility: 'private',
                    organizationId,
                    title: `Progress ${status}`,
                    targetValue: 100,
                    currentValue: status === 'completed' ? 100 : 50,
                    startValue: 0,
                    deadline: Date.now() + 24 * 60 * 60 * 1000,
                    status,
                    completedAt: status === 'completed' ? Date.now() : undefined,
                    earlyBirdCompleted: status === 'completed',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });
        }

        test('sets completedAt when objective completes', async () => {
            const objectiveId = await insertObjective('active');

            await t.run(async ctx => {
                await applyObjectiveProgressDelta(ctx, objectiveId, 50);

                const objective = await ctx.db.get('objectives', objectiveId);
                expect(objective?.status).toBe('completed');
                expect(objective?.completedAt).toBeDefined();
                expect(objective?.earlyBirdCompleted).toBe(true);
            });
        });

        test('clears completedAt when objective reopens', async () => {
            const objectiveId = await insertObjective('completed');

            await t.run(async ctx => {
                await applyObjectiveProgressDelta(ctx, objectiveId, -50);

                const objective = await ctx.db.get('objectives', objectiveId);
                expect(objective?.status).toBe('active');
                expect(objective?.completedAt).toBeUndefined();
                expect(objective?.earlyBirdCompleted).toBe(false);
            });
        });
    });
});
