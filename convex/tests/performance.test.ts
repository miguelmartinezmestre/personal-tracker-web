import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { internal } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestUser, createTestOrganization, createTestMember } from './test_helpers';
import { TestConvexForDataModel } from 'convex-test';
import { DataModel, Id } from '../_generated/dataModel';

describe('performance tests', async () => {
    const t = initConvexTest();
    let userIdentity: TestConvexForDataModel<DataModel>;
    let userId: Id<'user'>;
    let organizationId: Id<'organization'>;

    beforeEach(async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);

        const userData = await createTestUser(t, {
            userId: 'perf-test-user-' + randomSuffix,
            email: 'perf-test@example.com-' + randomSuffix,
            name: 'Performance Test User ' + randomSuffix,
            password: 'test-password',
            role: 'admin',
            emailVerified: false,
        });
        userId = userData.docId;

        const orgId = await createTestOrganization(t, {
            name: 'Performance Org ' + randomSuffix,
            slug: 'perf-org-' + randomSuffix,
        });

        await createTestMember(t, {
            organizationId: orgId,
            userId,
            role: 'owner',
        });

        organizationId = orgId;

        userIdentity = t.withIdentity({
            subject: userData.docId,
            role: userData.role ?? 'admin',
            email: userData.email,
            name: userData.name,
            password: 'test-password',
            emailVerified: false,
            createdAt: Date.now(),
            userId: userData.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });
    });

    describe('dashboard query performance', () => {
        test('getMonthlyProgress should use O(1) queries regardless of objective count', async () => {
            const objectiveIds: Id<'objectives'>[] = [];
            await userIdentity.run(async ctx => {
                for (let i = 0; i < 50; i++) {
                    const id = await ctx.db.insert('objectives', {
                        userId: userId,
                        organizationId: organizationId,
                        scope: 'personal',
                        title: `Objective ${i}`,
                        targetValue: 100,
                        currentValue: 50,
                        status: 'active',
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                    objectiveIds.push(id);
                }
            });

            const now = Date.now();
            await userIdentity.run(async ctx => {
                for (const objectiveId of objectiveIds) {
                    for (let j = 0; j < 20; j++) {
                        await ctx.db.insert('progressUpdates', {
                            objective: objectiveId,
                            userId: userId,
                            updatedValue: 5,
                            updateDate: now - j * 24 * 60 * 60 * 1000,
                            createdAt: now,
                            updatedAt: now,
                        });
                    }
                }
            });

            const start = Date.now();
            const result = await userIdentity.query(api.dashboard.getMonthlyProgress, {});
            const duration = Date.now() - start;

            expect(result).toHaveLength(6);
            expect(duration).toBeLessThan(3000);
        });

        test('getRecentActivity should use O(1) queries for progress updates', async () => {
            const objectiveIds: Id<'objectives'>[] = [];
            await userIdentity.run(async ctx => {
                for (let i = 0; i < 20; i++) {
                    const id = await ctx.db.insert('objectives', {
                        userId: userId,
                        organizationId: organizationId,
                        scope: 'personal',
                        title: `Activity Objective ${i}`,
                        targetValue: 100,
                        currentValue: 50,
                        status: 'active',
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                    objectiveIds.push(id);
                }
            });

            const now = Date.now();
            await userIdentity.run(async ctx => {
                for (const objectiveId of objectiveIds) {
                    for (let j = 0; j < 50; j++) {
                        await ctx.db.insert('progressUpdates', {
                            objective: objectiveId,
                            userId: userId,
                            updatedValue: 2,
                            updateDate: now - j * 24 * 60 * 60 * 1000,
                            createdAt: now,
                            updatedAt: now,
                        });
                    }
                }
            });

            const start = Date.now();
            const result = await userIdentity.query(api.dashboard.getRecentActivity, {});
            const duration = Date.now() - start;

            expect(result.progressUpdatesCount).toBeGreaterThan(0);
            expect(duration).toBeLessThan(1000);
        });
    });

    describe('organizations query performance', () => {
        test('getOrganizationsByUser should use specific ID lookups instead of global scan', async () => {
            const orgIds: Id<'organization'>[] = [];
            for (let i = 0; i < 100; i++) {
                const orgId = await createTestOrganization(t, {
                    name: `Bulk Org ${i}`,
                    slug: `bulk-org-${i}-${Math.random().toString(36).substring(2, 8)}`,
                });
                orgIds.push(orgId);
            }

            for (let i = 0; i < 5; i++) {
                await createTestMember(t, {
                    organizationId: orgIds[i]!,
                    userId,
                    role: 'member',
                });
            }

            const start = Date.now();
            const result = await userIdentity.query(api.organizations.getOrganizationsByUser, {});
            const duration = Date.now() - start;

            expect(result).toHaveLength(6);
            expect(duration).toBeLessThan(500);
        });

        test('getOrganizationMembers should fetch specific users not global scan', async () => {
            const memberIds: Id<'user'>[] = [];
            for (let i = 0; i < 50; i++) {
                const member = await createTestUser(t, {
                    userId: `bulk-user-${i}`,
                    email: `bulk${i}@example.com`,
                    name: `Bulk User ${i}`,
                    password: 'test',
                    role: 'member',
                    emailVerified: false,
                });
                memberIds.push(member.docId);
            }

            for (let i = 0; i < 10; i++) {
                await createTestMember(t, {
                    organizationId,
                    userId: memberIds[i]!,
                    role: 'member',
                });
            }

            const start = Date.now();
            const result = await userIdentity.query(api.organizations.getOrganizationMembers, {
                organizationId,
                paginationOpts: { numItems: 10, cursor: null },
            });
            const duration = Date.now() - start;

            expect(result.page).toHaveLength(10);
            expect(duration).toBeLessThan(500);
        });
    });

    describe('achievements query performance', () => {
        test('getUserAchievementProgress should use O(1) queries for progress updates', async () => {
            await userIdentity.mutation(api.achievements.seedAchievementDefinitions, {});

            const objectiveIds: Id<'objectives'>[] = [];
            await userIdentity.run(async ctx => {
                for (let i = 0; i < 50; i++) {
                    const id = await ctx.db.insert('objectives', {
                        userId: userId,
                        organizationId: organizationId,
                        scope: 'personal',
                        title: `Achievement Objective ${i}`,
                        targetValue: 100,
                        currentValue: 50,
                        status: 'active',
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                    objectiveIds.push(id);
                }
            });

            const now = Date.now();
            await userIdentity.run(async ctx => {
                for (const objectiveId of objectiveIds) {
                    for (let j = 0; j < 2; j++) {
                        await ctx.db.insert('progressUpdates', {
                            objective: objectiveId,
                            userId: userId,
                            updatedValue: 5,
                            updateDate: now - j * 24 * 60 * 60 * 1000,
                            createdAt: now,
                            updatedAt: now,
                        });
                    }
                }
            });

            const start = Date.now();
            const result = await userIdentity.query(
                api.achievements.getUserAchievementProgress,
                {}
            );
            const duration = Date.now() - start;

            expect(result.length).toBeGreaterThan(0);
            expect(duration).toBeLessThan(1000);
        });
    });

    describe('checkUserAchievements internal mutation performance', () => {
        test('should handle large batches without N+1 queries', async () => {
            const objectiveIds: Id<'objectives'>[] = [];
            await userIdentity.run(async ctx => {
                for (let i = 0; i < 50; i++) {
                    const id = await ctx.db.insert('objectives', {
                        userId: userId,
                        organizationId: organizationId,
                        scope: 'personal',
                        title: `Batch Objective ${i}`,
                        targetValue: 100,
                        currentValue: 50,
                        status: 'active',
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                    objectiveIds.push(id);
                }
            });

            const now = Date.now();
            await userIdentity.run(async ctx => {
                for (const objectiveId of objectiveIds) {
                    await ctx.db.insert('progressUpdates', {
                        objective: objectiveId,
                        userId: userId,
                        updatedValue: 10,
                        updateDate: now,
                        createdAt: now,
                        updatedAt: now,
                    });
                }
            });

            const start = Date.now();
            const result = await userIdentity.run(async ctx => {
                return ctx.runMutation(internal.achievements.checkUserAchievements, {
                    userId,
                    organizationId,
                    trigger: 'progress_update',
                });
            });
            const duration = Date.now() - start;

            expect(result).toBeDefined();
            expect(duration).toBeLessThan(2000);
        });
    });
});
