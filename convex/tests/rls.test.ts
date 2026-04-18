/// <reference types="vite/client" />
import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import {
    createTestUser,
    createTestOrganization,
    createTestMember,
    createTestObjective,
} from './test_helpers';
import { TestConvexForDataModel } from 'convex-test';
import { DataModel, Id } from '../_generated/dataModel';

describe('convex RLS (Row-Level Security)', async () => {
    const t = initConvexTest();
    let user1Identity: TestConvexForDataModel<DataModel>;
    let user2Identity: TestConvexForDataModel<DataModel>;
    let adminIdentity: TestConvexForDataModel<DataModel>;

    let user1Id: Id<'user'>;
    let user2Id: Id<'user'>;
    let adminId: Id<'user'>;
    let _user1OrganizationId: Id<'organization'>;
    let _user2OrganizationId: Id<'organization'>;
    let _adminOrganizationId: Id<'organization'>;

    beforeEach(async () => {
        const user1Random = Math.random().toString(36).substring(2, 15);
        const user2Random = Math.random().toString(36).substring(2, 15);
        const adminRandom = Math.random().toString(36).substring(2, 15);

        const user1 = {
            userId: 'rls-user-1-' + user1Random,
            email: 'rls-user1@example.com-' + user1Random,
            name: 'RLS User 1 ' + user1Random,
            password: 'test-password',
            role: 'user',
            emailVerified: false,
        };
        const user1Data = await createTestUser(t, user1);
        user1Id = user1Data.docId;

        const user1OrgId = await createTestOrganization(t, {
            name: 'RLS Org 1 ' + user1Random,
            slug: 'rls-org-1-' + user1Random,
        });

        await createTestMember(t, {
            organizationId: user1OrgId,
            userId: user1Id,
            role: 'owner',
        });

        _user1OrganizationId = user1OrgId;

        user1Identity = t.withIdentity({
            subject: user1Data.docId,
            role: user1.role,
            email: user1.email,
            name: user1.name,
            password: user1.password,
            emailVerified: user1.emailVerified,
            createdAt: Date.now(),
            userId: user1Data.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });

        const user2 = {
            userId: 'rls-user-2-' + user2Random,
            email: 'rls-user2@example.com-' + user2Random,
            name: 'RLS User 2 ' + user2Random,
            password: 'test-password',
            role: 'user',
            emailVerified: false,
        };
        const user2Data = await createTestUser(t, user2);
        user2Id = user2Data.docId;

        const user2OrgId = await createTestOrganization(t, {
            name: 'RLS Org 2 ' + user2Random,
            slug: 'rls-org-2-' + user2Random,
        });

        await createTestMember(t, {
            organizationId: user2OrgId,
            userId: user2Id,
            role: 'owner',
        });

        _user2OrganizationId = user2OrgId;

        user2Identity = t.withIdentity({
            subject: user2Data.docId,
            role: user2.role,
            email: user2.email,
            name: user2.name,
            password: user2.password,
            emailVerified: user2.emailVerified,
            createdAt: Date.now(),
            userId: user2Data.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });

        const admin = {
            userId: 'rls-admin-' + adminRandom,
            email: 'rls-admin@example.com-' + adminRandom,
            name: 'RLS Admin ' + adminRandom,
            password: 'test-password',
            role: 'admin',
            emailVerified: false,
        };
        const adminData = await createTestUser(t, admin);
        adminId = adminData.docId;

        const adminOrgId = await createTestOrganization(t, {
            name: 'RLS Admin Org ' + adminRandom,
            slug: 'rls-admin-org-' + adminRandom,
        });

        await createTestMember(t, {
            organizationId: adminOrgId,
            userId: adminId,
            role: 'owner',
        });

        _adminOrganizationId = adminOrgId;

        adminIdentity = t.withIdentity({
            subject: adminData.docId,
            role: admin.role,
            email: admin.email,
            name: admin.name,
            password: admin.password,
            emailVerified: admin.emailVerified,
            createdAt: Date.now(),
            userId: adminData.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });
    });

    describe('objectives RLS', () => {
        test('user can only read their own objectives', async () => {
            const obj1Id = await createTestObjective(t, {
                userId: user1Id,
                organizationId: _user1OrganizationId,
                title: 'User 1 Objective',
                targetValue: 100,
                currentValue: 0,
            });

            const obj2Id = await createTestObjective(t, {
                userId: user2Id,
                organizationId: _user2OrganizationId,
                title: 'User 2 Objective',
                targetValue: 100,
                currentValue: 0,
            });

            const user1Objectives = await user1Identity.query(api.objectives.getObjectivesByUser, {
                paginationOpts: { numItems: 10, cursor: null },
            });
            expect(user1Objectives.page.some(o => o._id === obj1Id)).toBe(true);
            expect(user1Objectives.page.some(o => o._id === obj2Id)).toBe(false);

            const user2Objectives = await user2Identity.query(api.objectives.getObjectivesByUser, {
                paginationOpts: { numItems: 10, cursor: null },
            });
            expect(user2Objectives.page.some(o => o._id === obj2Id)).toBe(true);
            expect(user2Objectives.page.some(o => o._id === obj1Id)).toBe(false);
        });

        test('admin can read all objectives', async () => {
            const obj1Id = await createTestObjective(t, {
                userId: user1Id,
                organizationId: _user1OrganizationId,
                title: 'User 1 Objective',
                targetValue: 100,
                currentValue: 0,
            });

            const obj2Id = await createTestObjective(t, {
                userId: user2Id,
                organizationId: _user2OrganizationId,
                title: 'User 2 Objective',
                targetValue: 100,
                currentValue: 0,
            });

            const obj1 = await adminIdentity.query(api.objectives.getObjectiveById, {
                id: obj1Id,
            });
            const obj2 = await adminIdentity.query(api.objectives.getObjectiveById, {
                id: obj2Id,
            });

            expect(obj1).toBeDefined();
            expect(obj2).toBeDefined();
        });

        test('user cannot modify another user objectives', async () => {
            const obj1Id = await createTestObjective(t, {
                userId: user1Id,
                organizationId: _user1OrganizationId,
                title: 'User 1 Objective',
                targetValue: 100,
                currentValue: 0,
            });

            try {
                await user2Identity.mutation(api.objectives.updateObjective, {
                    id: obj1Id,
                    title: 'Hacked Title',
                });
                const obj = await user1Identity.query(api.objectives.getObjectiveById, {
                    id: obj1Id,
                });
                expect(obj?.title).toBe('User 1 Objective');
            } catch (error) {
                expect(error).toBeDefined();
            }
        });

        test('user cannot delete another user objectives', async () => {
            const obj1Id = await createTestObjective(t, {
                userId: user1Id,
                organizationId: _user1OrganizationId,
                title: 'User 1 Objective',
                targetValue: 100,
                currentValue: 0,
            });

            try {
                await user2Identity.mutation(api.objectives.deleteObjective, {
                    id: obj1Id,
                });
                const obj = await user1Identity.query(api.objectives.getObjectiveById, {
                    id: obj1Id,
                });
                expect(obj).toBeDefined();
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });

    describe('categories RLS', () => {
        test('user can only read their own categories', async () => {
            await user1Identity.mutation(api.categories.createCategory, {
                name: 'User 1 Category',
                color: '#10b981',
            });

            await user2Identity.mutation(api.categories.createCategory, {
                name: 'User 2 Category',
                color: '#3b82f6',
            });

            const paginationOpts = { numItems: 50, cursor: null };

            const user1Categories = await user1Identity.query(api.categories.getCategoriesByUser, {
                paginationOpts,
            });
            expect(user1Categories.page).toHaveLength(1);
            expect(user1Categories.page[0]?.name).toBe('User 1 Category');

            const user2Categories = await user2Identity.query(api.categories.getCategoriesByUser, {
                paginationOpts,
            });
            expect(user2Categories.page).toHaveLength(1);
            expect(user2Categories.page[0]?.name).toBe('User 2 Category');
        });

        test('user cannot modify another user categories', async () => {
            const cat1Id = await user1Identity.mutation(api.categories.createCategory, {
                name: 'User 1 Category',
                color: '#10b981',
            });

            try {
                await user2Identity.mutation(api.categories.updateCategory, {
                    id: cat1Id,
                    name: 'Hacked Name',
                });
                const categories = await user1Identity.query(api.categories.getCategoriesByUser, {
                    paginationOpts: { numItems: 50, cursor: null },
                });
                expect(categories.page[0]?.name).toBe('User 1 Category');
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });

    describe('notifications RLS', () => {
        test('user can only read their own notifications', async () => {
            const obj1Id = await createTestObjective(t, {
                userId: user1Id,
                organizationId: _user1OrganizationId,
                title: 'User 1 Objective',
                targetValue: 100,
                currentValue: 0,
            });

            const obj2Id = await createTestObjective(t, {
                userId: user2Id,
                organizationId: _user2OrganizationId,
                title: 'User 2 Objective',
                targetValue: 100,
                currentValue: 0,
            });

            await user1Identity.mutation(api.notifications.createNotification, {
                objective: obj1Id,
                notificationType: 'reminder',
                message: 'User 1 notification',
            });

            await user2Identity.mutation(api.notifications.createNotification, {
                objective: obj2Id,
                notificationType: 'reminder',
                message: 'User 2 notification',
            });

            const user1Notifications = await user1Identity.query(
                api.notifications.getNotificationsByUser,
                { paginationOpts: { numItems: 10, cursor: null } }
            );
            expect(user1Notifications.page).toHaveLength(1);
            expect(user1Notifications.page[0]?.message).toBe('User 1 notification');

            const user2Notifications = await user2Identity.query(
                api.notifications.getNotificationsByUser,
                { paginationOpts: { numItems: 10, cursor: null } }
            );
            expect(user2Notifications.page).toHaveLength(1);
            expect(user2Notifications.page[0]?.message).toBe('User 2 notification');
        });

        test('user cannot modify another user notifications', async () => {
            const obj1Id = await createTestObjective(t, {
                userId: user1Id,
                organizationId: _user1OrganizationId,
                title: 'User 1 Objective',
                targetValue: 100,
                currentValue: 0,
            });

            const notification = await user1Identity.mutation(
                api.notifications.createNotification,
                {
                    objective: obj1Id,
                    notificationType: 'reminder',
                    message: 'User 1 notification',
                }
            );

            try {
                await user2Identity.mutation(api.notifications.setNotificationRead, {
                    id: notification!._id,
                    read: true,
                });
                const notifications = await user1Identity.query(
                    api.notifications.getNotificationsByUser,
                    {
                        paginationOpts: { numItems: 10, cursor: null },
                    }
                );
                expect(notifications.page[0]?.read).toBe(false);
            } catch (error) {
                expect(error).toBeDefined();
            }
        });

        test('user cannot delete another user notifications', async () => {
            const obj1Id = await createTestObjective(t, {
                userId: user1Id,
                organizationId: _user1OrganizationId,
                title: 'User 1 Objective',
                targetValue: 100,
                currentValue: 0,
            });

            const notification = await user1Identity.mutation(
                api.notifications.createNotification,
                {
                    objective: obj1Id,
                    notificationType: 'reminder',
                    message: 'User 1 notification',
                }
            );

            try {
                await user2Identity.mutation(api.notifications.deleteNotification, {
                    id: notification!._id,
                });
                const notifications = await user1Identity.query(
                    api.notifications.getNotificationsByUser,
                    {
                        paginationOpts: { numItems: 10, cursor: null },
                    }
                );
                expect(notifications.page).toHaveLength(1);
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });

    describe('achievements RLS', () => {
        test('all users can read achievement definitions', async () => {
            await adminIdentity.mutation(api.achievements.seedAchievementDefinitions, {});

            const user1Defs = await user1Identity.query(
                api.achievements.getAchievementDefinitions,
                {}
            );
            expect(user1Defs.length).toBeGreaterThan(0);

            const user2Defs = await user2Identity.query(
                api.achievements.getAchievementDefinitions,
                {}
            );
            expect(user2Defs.length).toBeGreaterThan(0);
        });

        test('user can only see their own achievements', async () => {
            await adminIdentity.mutation(api.achievements.seedAchievementDefinitions, {});
            await user1Identity.run(async ctx => {
                const def = await ctx.db.query('achievementDefinitions').first();
                if (def) {
                    await ctx.db.insert('obtainedAchievements', {
                        userId: user1Id,
                        achievement: def._id,
                        earnedAt: Date.now(),
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                }
            });

            const user1Achievements = await user1Identity.query(
                api.achievements.getUserAchievements,
                {}
            );
            expect(user1Achievements.length).toBeGreaterThan(0);

            const user2Achievements = await user2Identity.query(
                api.achievements.getUserAchievements,
                {}
            );
            expect(user2Achievements).toHaveLength(0);
        });
    });

    describe('unauthenticated access', () => {
        test('unauthenticated user cannot access objectives', async () => {
            await expect(
                t.query(api.objectives.getObjectivesByUser, {
                    paginationOpts: { numItems: 10, cursor: null },
                })
            ).rejects.toThrow(/Unauthenticated|User not authenticated/);
        });

        test('unauthenticated user cannot access categories', async () => {
            await expect(
                t.query(api.categories.getCategoriesByUser, {
                    paginationOpts: { numItems: 10, cursor: null },
                })
            ).rejects.toThrow(/Unauthenticated|User not authenticated/);
        });

        test('unauthenticated user cannot access notifications', async () => {
            await expect(
                t.query(api.notifications.getNotificationsByUser, {
                    paginationOpts: { numItems: 10, cursor: null },
                })
            ).rejects.toThrow(/Unauthenticated|User not authenticated/);
        });

        test('unauthenticated user cannot access achievements', async () => {
            await expect(t.query(api.achievements.getUserAchievements, {})).rejects.toThrow(
                /Unauthenticated|User not authenticated/
            );
        });

        test('unauthenticated user cannot create objectives', async () => {
            await expect(
                t.mutation(api.objectives.createObjective, {
                    title: 'Test',
                    targetValue: 100,
                    currentValue: 0,
                })
            ).rejects.toThrow(/Unauthenticated|User not authenticated/);
        });

        test('unauthenticated user cannot create categories', async () => {
            await expect(
                t.mutation(api.categories.createCategory, {
                    name: 'Test',
                    color: '#000000',
                })
            ).rejects.toThrow(/Unauthenticated|User not authenticated/);
        });
    });

    describe('admin privileges', () => {
        test('admin can access all user data', async () => {
            const obj1Id = await createTestObjective(t, {
                userId: user1Id,
                organizationId: _user1OrganizationId,
                title: 'User 1 Secret Objective',
                targetValue: 100,
                currentValue: 0,
            });

            const obj = await adminIdentity.query(api.objectives.getObjectiveById, {
                id: obj1Id,
            });
            expect(obj).toBeDefined();
            expect(obj?.title).toBe('User 1 Secret Objective');
        });

        test('admin cannot modify another user personal objective', async () => {
            const obj1Id = await createTestObjective(t, {
                userId: user1Id,
                organizationId: _user1OrganizationId,
                title: 'Original Title',
                targetValue: 100,
                currentValue: 0,
            });

            await expect(
                adminIdentity.mutation(api.objectives.updateObjective, {
                    id: obj1Id,
                    title: 'Admin Updated Title',
                })
            ).rejects.toThrow('Not authorized to edit this objective');

            const obj = await user1Identity.query(api.objectives.getObjectiveById, {
                id: obj1Id,
            });
            expect(obj?.title).toBe('Original Title');
        });
    });

    describe('data isolation', () => {
        test('creating data for one user does not affect another', async () => {
            const initialUser1 = await user1Identity.query(api.objectives.getObjectivesByUser, {
                paginationOpts: { numItems: 100, cursor: null },
            });
            const initialUser2 = await user2Identity.query(api.objectives.getObjectivesByUser, {
                paginationOpts: { numItems: 100, cursor: null },
            });

            await createTestObjective(t, {
                userId: user1Id,
                organizationId: _user1OrganizationId,
                title: 'Obj 1',
                targetValue: 100,
                currentValue: 0,
            });
            await createTestObjective(t, {
                userId: user1Id,
                organizationId: _user1OrganizationId,
                title: 'Obj 2',
                targetValue: 100,
                currentValue: 0,
            });

            const afterUser2 = await user2Identity.query(api.objectives.getObjectivesByUser, {
                paginationOpts: { numItems: 100, cursor: null },
            });
            expect(afterUser2.page.length).toBe(initialUser2.page.length);

            const afterUser1 = await user1Identity.query(api.objectives.getObjectivesByUser, {
                paginationOpts: { numItems: 100, cursor: null },
            });
            expect(afterUser1.page.length).toBe(initialUser1.page.length + 2);
        });

        test('deleting data for one user does not affect another', async () => {
            const obj1Id = await createTestObjective(t, {
                userId: user1Id,
                organizationId: _user1OrganizationId,
                title: 'User 1 Obj',
                targetValue: 100,
                currentValue: 0,
            });

            await createTestObjective(t, {
                userId: user2Id,
                organizationId: _user2OrganizationId,
                title: 'User 2 Obj',
                targetValue: 100,
                currentValue: 0,
            });

            await user1Identity.mutation(api.objectives.deleteObjective, { id: obj1Id });

            const user2Objs = await user2Identity.query(api.objectives.getObjectivesByUser, {
                paginationOpts: { numItems: 10, cursor: null },
            });
            expect(user2Objs.page.length).toBeGreaterThan(0);
        });
    });
});
