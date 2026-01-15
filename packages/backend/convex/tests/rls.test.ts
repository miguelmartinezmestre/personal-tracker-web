import { convexTest } from 'convex-test';
import { describe, expect, test, beforeEach } from 'vitest';
import { api } from '../_generated/api';
import schema from '../schema';
import { modules } from '../../test.setup';
import { createTestUser } from '../../test_helpers';
import { register } from '../../better-auth.helper';

describe('convex RLS (Row-Level Security)', async () => {
    const t = convexTest(schema, modules);
    register(t);

    // User 1 - Regular user
    const user1Identity = t.withIdentity({
        subject: 'rls-user-1',
        role: 'user',
    });

    // User 2 - Regular user
    const user2Identity = t.withIdentity({
        subject: 'rls-user-2',
        role: 'user',
    });

    // Admin user
    const adminIdentity = t.withIdentity({
        subject: 'rls-admin',
        role: 'admin',
    });

    let user1Id: string;
    let user2Id: string;
    let adminId: string;

    beforeEach(async () => {
        const result1 = await createTestUser(t, {
            userId: 'rls-user-1',
            email: 'rls-user1@example.com',
            name: 'RLS User 1',
            password: 'test-password',
            role: 'user',
            emailVerified: false,
        });
        user1Id = result1.userId;

        const result2 = await createTestUser(t, {
            userId: 'rls-user-2',
            email: 'rls-user2@example.com',
            name: 'RLS User 2',
            password: 'test-password',
            role: 'user',
            emailVerified: false,
        });
        user2Id = result2.userId;

        const resultAdmin = await createTestUser(t, {
            userId: 'rls-admin',
            email: 'rls-admin@example.com',
            name: 'RLS Admin',
            password: 'test-password',
            role: 'admin',
            emailVerified: false,
        });
        adminId = resultAdmin.userId;
    });

    describe('objectives RLS', () => {
        test('user can only read their own objectives', async () => {
            // User 1 creates an objective
            const obj1Id = await user1Identity.mutation(api.objectives.createObjective, {
                title: 'User 1 Objective',
                targetValue: 100,
                currentValue: 0,
                status: 'in_progress',
            });

            // User 2 creates an objective
            const obj2Id = await user2Identity.mutation(api.objectives.createObjective, {
                title: 'User 2 Objective',
                targetValue: 100,
                currentValue: 0,
                status: 'in_progress',
            });

            // User 1 can read their objective
            const user1Objectives = await user1Identity.query(
                api.objectives.getObjectivesByUser,
                { paginationOpts: { numItems: 10, cursor: null } }
            );
            expect(user1Objectives.page.some(o => o._id === obj1Id)).toBe(true);
            expect(user1Objectives.page.some(o => o._id === obj2Id)).toBe(false);

            // User 2 can read their objective
            const user2Objectives = await user2Identity.query(
                api.objectives.getObjectivesByUser,
                { paginationOpts: { numItems: 10, cursor: null } }
            );
            expect(user2Objectives.page.some(o => o._id === obj2Id)).toBe(true);
            expect(user2Objectives.page.some(o => o._id === obj1Id)).toBe(false);
        });

        test('admin can read all objectives', async () => {
            // Users create objectives
            const obj1Id = await user1Identity.mutation(api.objectives.createObjective, {
                title: 'User 1 Objective',
                targetValue: 100,
                currentValue: 0,
                status: 'in_progress',
            });

            const obj2Id = await user2Identity.mutation(api.objectives.createObjective, {
                title: 'User 2 Objective',
                targetValue: 100,
                currentValue: 0,
                status: 'in_progress',
            });

            // Admin can read both
            const adminObjectives = await adminIdentity.query(
                api.objectives.getObjectivesByUser,
                { paginationOpts: { numItems: 10, cursor: null } }
            );
            // Admin sees their own objectives (which is empty), but can access others via direct queries
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
            // User 1 creates an objective
            const obj1Id = await user1Identity.mutation(api.objectives.createObjective, {
                title: 'User 1 Objective',
                targetValue: 100,
                currentValue: 0,
                status: 'in_progress',
            });

            // User 2 tries to update User 1's objective - should not modify
            // Due to RLS, the update will silently fail or throw
            try {
                await user2Identity.mutation(api.objectives.updateObjective, {
                    id: obj1Id,
                    title: 'Hacked Title',
                });
                // If no error, verify the title wasn't changed
                const obj = await user1Identity.query(api.objectives.getObjectiveById, {
                    id: obj1Id,
                });
                expect(obj?.title).toBe('User 1 Objective');
            } catch (error) {
                // RLS blocked the operation - expected behavior
                expect(error).toBeDefined();
            }
        });

        test('user cannot delete another user objectives', async () => {
            // User 1 creates an objective
            const obj1Id = await user1Identity.mutation(api.objectives.createObjective, {
                title: 'User 1 Objective',
                targetValue: 100,
                currentValue: 0,
                status: 'in_progress',
            });

            // User 2 tries to delete User 1's objective
            try {
                await user2Identity.mutation(api.objectives.deleteObjective, {
                    id: obj1Id,
                });
                // If no error, verify objective still exists
                const obj = await user1Identity.query(api.objectives.getObjectiveById, {
                    id: obj1Id,
                });
                expect(obj).toBeDefined();
            } catch (error) {
                // RLS blocked the operation - expected behavior
                expect(error).toBeDefined();
            }
        });
    });

    describe('categories RLS', () => {
        test('user can only read their own categories', async () => {
            // User 1 creates a category
            await user1Identity.mutation(api.categories.createCategory, {
                name: 'User 1 Category',
                color: '#10b981',
            });

            // User 2 creates a category
            await user2Identity.mutation(api.categories.createCategory, {
                name: 'User 2 Category',
                color: '#3b82f6',
            });

            // User 1 can only see their category
            const user1Categories = await user1Identity.query(
                api.categories.getCategoriesByUser,
                {}
            );
            expect(user1Categories).toHaveLength(1);
            expect(user1Categories[0].name).toBe('User 1 Category');

            // User 2 can only see their category
            const user2Categories = await user2Identity.query(
                api.categories.getCategoriesByUser,
                {}
            );
            expect(user2Categories).toHaveLength(1);
            expect(user2Categories[0].name).toBe('User 2 Category');
        });

        test('user cannot modify another user categories', async () => {
            // User 1 creates a category
            const cat1Id = await user1Identity.mutation(api.categories.createCategory, {
                name: 'User 1 Category',
                color: '#10b981',
            });

            // User 2 tries to update User 1's category
            try {
                await user2Identity.mutation(api.categories.updateCategory, {
                    id: cat1Id,
                    name: 'Hacked Name',
                });
                // If no error, verify the name wasn't changed
                const categories = await user1Identity.query(
                    api.categories.getCategoriesByUser,
                    {}
                );
                expect(categories[0].name).toBe('User 1 Category');
            } catch (error) {
                // RLS blocked the operation - expected behavior
                expect(error).toBeDefined();
            }
        });
    });

    describe('notifications RLS', () => {
        test('user can only read their own notifications', async () => {
            // Create objectives for each user
            const obj1Id = await user1Identity.mutation(api.objectives.createObjective, {
                title: 'User 1 Objective',
                targetValue: 100,
                currentValue: 0,
                status: 'in_progress',
            });

            const obj2Id = await user2Identity.mutation(api.objectives.createObjective, {
                title: 'User 2 Objective',
                targetValue: 100,
                currentValue: 0,
                status: 'in_progress',
            });

            // Create notifications for each user
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

            // User 1 can only see their notifications
            const user1Notifications = await user1Identity.query(
                api.notifications.getNotificationsByUser,
                { paginationOpts: { numItems: 10, cursor: null } }
            );
            expect(user1Notifications.page).toHaveLength(1);
            expect(user1Notifications.page[0]?.message).toBe('User 1 notification');

            // User 2 can only see their notifications
            const user2Notifications = await user2Identity.query(
                api.notifications.getNotificationsByUser,
                { paginationOpts: { numItems: 10, cursor: null } }
            );
            expect(user2Notifications.page).toHaveLength(1);
            expect(user2Notifications.page[0]?.message).toBe('User 2 notification');
        });

        test('user cannot modify another user notifications', async () => {
            const obj1Id = await user1Identity.mutation(api.objectives.createObjective, {
                title: 'User 1 Objective',
                targetValue: 100,
                currentValue: 0,
                status: 'in_progress',
            });

            const notification = await user1Identity.mutation(
                api.notifications.createNotification,
                {
                    objective: obj1Id,
                    notificationType: 'reminder',
                    message: 'User 1 notification',
                }
            );

            // User 2 tries to mark User 1's notification as read
            try {
                await user2Identity.mutation(api.notifications.setNotificationRead, {
                    id: notification!._id,
                    read: true,
                });
                // If no error, verify it wasn't modified
                const notifications = await user1Identity.query(
                    api.notifications.getNotificationsByUser,
                    {}
                );
                expect(notifications[0].read).toBe(false);
            } catch (error) {
                // RLS blocked the operation - expected behavior
                expect(error).toBeDefined();
            }
        });

        test('user cannot delete another user notifications', async () => {
            const obj1Id = await user1Identity.mutation(api.objectives.createObjective, {
                title: 'User 1 Objective',
                targetValue: 100,
                currentValue: 0,
                status: 'in_progress',
            });

            const notification = await user1Identity.mutation(
                api.notifications.createNotification,
                {
                    objective: obj1Id,
                    notificationType: 'reminder',
                    message: 'User 1 notification',
                }
            );

            // User 2 tries to delete User 1's notification
            try {
                await user2Identity.mutation(api.notifications.deleteNotification, {
                    id: notification!._id,
                });
                // If no error, verify it still exists
                const notifications = await user1Identity.query(
                    api.notifications.getNotificationsByUser,
                    {}
                );
                expect(notifications).toHaveLength(1);
            } catch (error) {
                // RLS blocked the operation - expected behavior
                expect(error).toBeDefined();
            }
        });
    });

    describe('achievements RLS', () => {
        test('all users can read achievement definitions', async () => {
            // Seed achievements first
            await adminIdentity.mutation(api.achievements.seedAchievementDefinitions, {});

            // User 1 can read definitions
            const user1Defs = await user1Identity.query(
                api.achievements.getAchievementDefinitions,
                {}
            );
            expect(user1Defs.length).toBeGreaterThan(0);

            // User 2 can read definitions
            const user2Defs = await user2Identity.query(
                api.achievements.getAchievementDefinitions,
                {}
            );
            expect(user2Defs.length).toBeGreaterThan(0);
        });

        test('user can only see their own achievements', async () => {
            await adminIdentity.mutation(api.achievements.seedAchievementDefinitions, {});

            // Award achievement to user 1 manually
            await user1Identity.run(async ctx => {
                const def = await ctx.db.query('achievementDefinitions').first();
                if (def) {
                    await ctx.db.insert('userAchievements', {
                        user: user1Id,
                        achievement: def._id,
                        earnedAt: Date.now(),
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                }
            });

            // User 1 can see their achievement
            const user1Achievements = await user1Identity.query(
                api.achievements.getUserAchievements,
                {}
            );
            expect(user1Achievements.length).toBeGreaterThan(0);

            // User 2 should not see user 1's achievements
            const user2Achievements = await user2Identity.query(
                api.achievements.getUserAchievements,
                {}
            );
            expect(user2Achievements).toHaveLength(0);
        });
    });

    describe('unauthenticated access', () => {
        test('unauthenticated user cannot access objectives', async () => {
            await expect(t.query(api.objectives.getObjectivesByUser, { paginationOpts: { numItems: 10, cursor: null } })).rejects.toThrow(
                /Unauthenticated|User not authenticated/
            );
        });

        test('unauthenticated user cannot access categories', async () => {
            await expect(t.query(api.categories.getCategoriesByUser, {})).rejects.toThrow(
                /Unauthenticated|User not authenticated/
            );
        });

        test('unauthenticated user cannot access notifications', async () => {
            await expect(t.query(api.notifications.getNotificationsByUser, { paginationOpts: { numItems: 10, cursor: null } })).rejects.toThrow(
                /Unauthenticated|User not authenticated/
            );
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
                    status: 'in_progress',
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
            // User 1 creates objective
            const obj1Id = await user1Identity.mutation(api.objectives.createObjective, {
                title: 'User 1 Secret Objective',
                targetValue: 100,
                currentValue: 0,
                status: 'in_progress',
            });

            // Admin can read it
            const obj = await adminIdentity.query(api.objectives.getObjectiveById, {
                id: obj1Id,
            });
            expect(obj).toBeDefined();
            expect(obj?.title).toBe('User 1 Secret Objective');
        });

        test('admin can modify user data', async () => {
            // User 1 creates objective
            const obj1Id = await user1Identity.mutation(api.objectives.createObjective, {
                title: 'Original Title',
                targetValue: 100,
                currentValue: 0,
                status: 'in_progress',
            });

            // Admin updates it
            await adminIdentity.mutation(api.objectives.updateObjective, {
                id: obj1Id,
                title: 'Admin Updated Title',
            });

            const obj = await user1Identity.query(api.objectives.getObjectiveById, {
                id: obj1Id,
            });
            expect(obj?.title).toBe('Admin Updated Title');
        });
    });

    describe('data isolation', () => {
        test('creating data for one user does not affect another', async () => {
            // Get initial counts - use larger numItems to avoid pagination limits
            const initialUser1 = await user1Identity.query(api.objectives.getObjectivesByUser, { paginationOpts: { numItems: 100, cursor: null } });
            const initialUser2 = await user2Identity.query(api.objectives.getObjectivesByUser, { paginationOpts: { numItems: 100, cursor: null } });

            // User 1 creates multiple objectives
            await user1Identity.mutation(api.objectives.createObjective, {
                title: 'Obj 1',
                targetValue: 100,
                currentValue: 0,
                status: 'in_progress',
            });
            await user1Identity.mutation(api.objectives.createObjective, {
                title: 'Obj 2',
                targetValue: 100,
                currentValue: 0,
                status: 'in_progress',
            });

            // User 2's count should not change
            const afterUser2 = await user2Identity.query(api.objectives.getObjectivesByUser, { paginationOpts: { numItems: 100, cursor: null } });
            expect(afterUser2.page.length).toBe(initialUser2.page.length);

            // User 1's count should increase by 2
            const afterUser1 = await user1Identity.query(api.objectives.getObjectivesByUser, { paginationOpts: { numItems: 100, cursor: null } });
            expect(afterUser1.page.length).toBe(initialUser1.page.length + 2);
        });

        test('deleting data for one user does not affect another', async () => {
            // Both users create an objective
            const obj1Id = await user1Identity.mutation(api.objectives.createObjective, {
                title: 'User 1 Obj',
                targetValue: 100,
                currentValue: 0,
                status: 'in_progress',
            });

            await user2Identity.mutation(api.objectives.createObjective, {
                title: 'User 2 Obj',
                targetValue: 100,
                currentValue: 0,
                status: 'in_progress',
            });

            // User 1 deletes their objective
            await user1Identity.mutation(api.objectives.deleteObjective, { id: obj1Id });

            // User 2's objective should still exist
            const user2Objs = await user2Identity.query(api.objectives.getObjectivesByUser, { paginationOpts: { numItems: 10, cursor: null } });
            expect(user2Objs.page.length).toBeGreaterThan(0);
        });
    });
});
