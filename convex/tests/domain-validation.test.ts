import { beforeEach, describe, expect, test } from 'vitest';
import { ConvexError } from 'convex/values';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestUser, createTestOrganization, createTestMember } from './test_helpers';
import { TestConvexForDataModel } from 'convex-test';
import { DataModel, Id } from '../_generated/dataModel';
import { ERROR_CODES, TIME } from '../utils/constants';
import {
    validateObjectiveMetrics,
    validateProgressDelta,
    validateUpdateDate,
    validateObjectiveNotCompleted,
} from '../utils/objectiveDomain';

describe('Domain Validation Tests', () => {
    const t = initConvexTest();
    let userIdentity: TestConvexForDataModel<DataModel>;
    let userId: Id<'user'>;
    let organizationId: Id<'organization'>;

    beforeEach(async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);

        const user = {
            userId: 'test-user-domain-' + randomSuffix,
            email: 'domain-test@example.com-' + randomSuffix,
            name: 'Domain Test User ' + randomSuffix,
            password: 'test-password',
            role: 'admin',
            emailVerified: false,
        };

        const userData = await createTestUser(t, user);
        userId = userData.docId;

        const orgId = await createTestOrganization(t, {
            name: 'Domain Test Org ' + randomSuffix,
            slug: 'domain-test-org-' + randomSuffix,
        });

        await createTestMember(t, {
            organizationId: orgId,
            userId,
            role: 'owner',
        });

        organizationId = orgId;

        userIdentity = t.withIdentity({
            subject: userData.docId,
            role: user.role,
            email: user.email,
            name: user.name,
            password: user.password,
            emailVerified: user.emailVerified,
            createdAt: Date.now(),
            userId: userData.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });
    });

    describe('validateObjectiveMetrics', () => {
        test.each([
            { value: 0, error: ERROR_CODES.TARGET_TOO_SMALL },
            { value: -1, error: ERROR_CODES.TARGET_TOO_SMALL },
            { value: Number.NaN, error: ERROR_CODES.TARGET_NOT_FINITE },
            { value: Number.POSITIVE_INFINITY, error: ERROR_CODES.TARGET_NOT_FINITE },
            { value: 1_000_000_001, error: ERROR_CODES.TARGET_TOO_LARGE },
        ])('rejects invalid targetValue: $value', ({ value, error }) => {
            expect(() =>
                validateObjectiveMetrics({
                    targetValue: value,
                })
            ).toThrow(ConvexError);

            try {
                validateObjectiveMetrics({ targetValue: value });
            } catch (e) {
                expect(e).toBeInstanceOf(ConvexError);
                if (e instanceof ConvexError) {
                    expect(e.data).toBe(error);
                }
            }
        });

        test.each([
            { value: Number.NaN, error: ERROR_CODES.VALUE_NOT_FINITE },
            { value: Number.POSITIVE_INFINITY, error: ERROR_CODES.VALUE_NOT_FINITE },
            { value: -1, error: ERROR_CODES.VALUE_NEGATIVE },
            { value: 1_000_000_001, error: ERROR_CODES.VALUE_TOO_LARGE },
        ])('rejects invalid currentValue: $value', ({ value, error }) => {
            expect(() =>
                validateObjectiveMetrics({
                    currentValue: value,
                })
            ).toThrow(ConvexError);

            try {
                validateObjectiveMetrics({ currentValue: value });
            } catch (e) {
                expect(e).toBeInstanceOf(ConvexError);
                if (e instanceof ConvexError) {
                    expect(e.data).toBe(error);
                }
            }
        });

        test('accepts valid metrics', () => {
            expect(() =>
                validateObjectiveMetrics({
                    targetValue: 100,
                    currentValue: 50,
                    startValue: 0,
                })
            ).not.toThrow();
        });

        test('accepts minimum valid target', () => {
            expect(() =>
                validateObjectiveMetrics({
                    targetValue: 0.001,
                })
            ).not.toThrow();
        });

        test('accepts maximum valid value', () => {
            expect(() =>
                validateObjectiveMetrics({
                    currentValue: 1_000_000_000,
                })
            ).not.toThrow();
        });
    });

    describe('validateProgressDelta', () => {
        test.each([
            { value: Number.NaN, error: ERROR_CODES.VALUE_NOT_FINITE },
            { value: Number.POSITIVE_INFINITY, error: ERROR_CODES.VALUE_NOT_FINITE },
            { value: -1, error: ERROR_CODES.VALUE_NEGATIVE },
            { value: 1_000_000_001, error: ERROR_CODES.VALUE_TOO_LARGE },
        ])('rejects invalid progress value: $value', ({ value, error }) => {
            expect(() => validateProgressDelta(value)).toThrow(ConvexError);

            try {
                validateProgressDelta(value);
            } catch (e) {
                expect(e).toBeInstanceOf(ConvexError);
                if (e instanceof ConvexError) {
                    expect(e.data).toBe(error);
                }
            }
        });

        test.each([{ value: 0 }, { value: 1 }, { value: 100 }, { value: 1_000_000_000 }])(
            'accepts valid progress value: $value',
            ({ value }) => {
                expect(() => validateProgressDelta(value)).not.toThrow();
            }
        );
    });

    describe('validateUpdateDate', () => {
        test.each([
            {
                date: Date.now() + TIME.DAY_MS,
                error: ERROR_CODES.FUTURE_DATE_NOT_ALLOWED,
                description: 'tomorrow',
            },
            {
                date: Date.now() + TIME.WEEK_MS,
                error: ERROR_CODES.FUTURE_DATE_NOT_ALLOWED,
                description: 'next week',
            },
            {
                date: Date.now() - TIME.FIVE_YEARS_MS - TIME.DAY_MS,
                error: ERROR_CODES.DATE_TOO_OLD,
                description: 'more than 5 years ago',
            },
        ])('rejects future date: $description', ({ date, error }) => {
            expect(() => validateUpdateDate(date)).toThrow(ConvexError);

            try {
                validateUpdateDate(date);
            } catch (e) {
                expect(e).toBeInstanceOf(ConvexError);
                if (e instanceof ConvexError) {
                    expect(e.data).toBe(error);
                }
            }
        });

        test('accepts current date', () => {
            expect(() => validateUpdateDate(Date.now())).not.toThrow();
        });

        test('accepts recent past date', () => {
            expect(() => validateUpdateDate(Date.now() - TIME.DAY_MS)).not.toThrow();
        });

        test('accepts date within clock skew buffer', () => {
            expect(() => validateUpdateDate(Date.now() + 30 * 1000)).not.toThrow();
        });

        test('rejects date beyond clock skew buffer', () => {
            expect(() => validateUpdateDate(Date.now() + 2 * TIME.MINUTE_MS)).toThrow(ConvexError);
        });
    });

    describe('validateObjectiveNotCompleted', () => {
        test('throws when objective is completed', () => {
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

        test.each([{ status: 'active' }, { status: 'pending' }, { status: 'archived' }])(
            'does not throw for status: $status',
            ({ status }) => {
                expect(() => validateObjectiveNotCompleted(status)).not.toThrow();
            }
        );
    });

    describe('Integration: createUpdateProgress', () => {
        test.each([
            {
                description: 'future date',
                overrides: { updateDate: Date.now() + TIME.DAY_MS },
                expectedError: ERROR_CODES.FUTURE_DATE_NOT_ALLOWED,
            },
            {
                description: 'negative progress',
                overrides: { updatedValue: -1 },
                expectedError: ERROR_CODES.VALUE_NEGATIVE,
            },
            {
                description: 'too large progress',
                overrides: { updatedValue: 2_000_000_000 },
                expectedError: ERROR_CODES.VALUE_TOO_LARGE,
            },
        ])('rejects $description', async ({ overrides, expectedError }) => {
            const activeObjectiveId = await userIdentity.run(async ctx => {
                return await ctx.db.insert('objectives', {
                    userId: userId,
                    organizationId: organizationId,
                    scope: 'personal',
                    title: 'Active Test Objective',
                    targetValue: 100,
                    currentValue: 50,
                    startValue: 50,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            await expect(
                userIdentity.mutation(api.update_progress.createUpdateProgress, {
                    objective: activeObjectiveId,
                    updatedValue: 10,
                    updateDate: Date.now(),
                    ...overrides,
                })
            ).rejects.toThrow(expectedError);
        });

        test('rejects progress on completed objective', async () => {
            const completedObjectiveId = await userIdentity.run(async ctx => {
                return await ctx.db.insert('objectives', {
                    userId: userId,
                    organizationId: organizationId,
                    scope: 'personal',
                    title: 'Completed Test Objective',
                    targetValue: 100,
                    currentValue: 100,
                    startValue: 0,
                    status: 'completed',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            await expect(
                userIdentity.mutation(api.update_progress.createUpdateProgress, {
                    objective: completedObjectiveId,
                    updatedValue: 10,
                    updateDate: Date.now(),
                })
            ).rejects.toThrow(ERROR_CODES.OBJECTIVE_ALREADY_COMPLETED);
        });

        test('allows progress on active objective', async () => {
            const activeObjectiveId = await userIdentity.run(async ctx => {
                return await ctx.db.insert('objectives', {
                    userId: userId,
                    organizationId: organizationId,
                    scope: 'personal',
                    title: 'Active Test Objective',
                    targetValue: 100,
                    currentValue: 50,
                    startValue: 50,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const result = await userIdentity.mutation(api.update_progress.createUpdateProgress, {
                objective: activeObjectiveId,
                updatedValue: 10,
                updateDate: Date.now(),
            });

            expect(result).toBeDefined();
            expect(result?.updatedValue).toBe(10);
        });
    });

    describe('Integration: updateUpdateProgress', () => {
        test('rejects update to completed objective', async () => {
            const completedObjectiveId = await userIdentity.run(async ctx => {
                return await ctx.db.insert('objectives', {
                    userId: userId,
                    organizationId: organizationId,
                    scope: 'personal',
                    title: 'Completed Test Objective',
                    targetValue: 100,
                    currentValue: 100,
                    startValue: 0,
                    status: 'completed',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const progressUpdateId = await userIdentity.run(async ctx => {
                return await ctx.db.insert('progressUpdates', {
                    objective: completedObjectiveId,
                    userId: userId,
                    updatedValue: 60,
                    updateDate: Date.now(),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            await expect(
                userIdentity.mutation(api.update_progress.updateUpdateProgress, {
                    id: progressUpdateId,
                    updatedValue: 85,
                    updateDate: Date.now(),
                })
            ).rejects.toThrow(ERROR_CODES.OBJECTIVE_ALREADY_COMPLETED);
        });

        test.each([
            {
                description: 'future date',
                overrides: { updateDate: Date.now() + TIME.DAY_MS },
                expectedError: ERROR_CODES.FUTURE_DATE_NOT_ALLOWED,
            },
            {
                description: 'negative progress',
                overrides: { updatedValue: -1 },
                expectedError: ERROR_CODES.VALUE_NEGATIVE,
            },
        ])('rejects update with $description', async ({ overrides, expectedError }) => {
            const activeObjectiveId = await userIdentity.run(async ctx => {
                return await ctx.db.insert('objectives', {
                    userId: userId,
                    organizationId: organizationId,
                    scope: 'personal',
                    title: 'Active Test Objective',
                    targetValue: 100,
                    currentValue: 50,
                    startValue: 50,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const progressUpdateId = await userIdentity.run(async ctx => {
                return await ctx.db.insert('progressUpdates', {
                    objective: activeObjectiveId,
                    userId: userId,
                    updatedValue: 60,
                    updateDate: Date.now(),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            await expect(
                userIdentity.mutation(api.update_progress.updateUpdateProgress, {
                    id: progressUpdateId,
                    updatedValue: 70,
                    updateDate: Date.now(),
                    ...overrides,
                })
            ).rejects.toThrow(expectedError);
        });
    });

    describe('Integration: createObjective', () => {
        test.each([
            {
                description: 'target value too small',
                args: { targetValue: 0.0001 },
                expectedError: ERROR_CODES.TARGET_TOO_SMALL,
            },
            {
                description: 'target value too large',
                args: { targetValue: 2_000_000_000 },
                expectedError: ERROR_CODES.TARGET_TOO_LARGE,
            },
            {
                description: 'negative current value',
                args: { currentValue: -1 },
                expectedError: ERROR_CODES.VALUE_NEGATIVE,
            },
            {
                description: 'current value too large',
                args: { currentValue: 2_000_000_000 },
                expectedError: ERROR_CODES.VALUE_TOO_LARGE,
            },
        ])('rejects objective with $description', async ({ args, expectedError }) => {
            await expect(
                userIdentity.mutation(api.objectives.createObjective, {
                    title: 'Test Objective',
                    targetValue: args.targetValue ?? 100,
                    currentValue: args.currentValue,
                })
            ).rejects.toThrow(expectedError);
        });
    });
});
