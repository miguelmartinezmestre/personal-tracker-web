import { convexTest } from 'convex-test';
import { describe, expect, test, beforeEach } from 'vitest';
import { api } from './_generated/api';
import schema from './schema';
import { modules } from '../test.setup';
import { createTestUser } from './test_helpers';

describe('convex users', () => {
    const t = convexTest(schema, modules);
    let userId: string;

    const userIdentity = t.withIdentity({
        subject: 'test-user-123',
        role: 'admin',
    });

    beforeEach(async () => {
        // Create a complete test user with account (similar to better-auth sign-up)
        const result = await userIdentity.run(async ctx => {
            return await createTestUser(ctx, {
                userId: 'test-user-123',
                email: 'test@example.com',
                name: 'Test User',
                password: 'test-password',
                role: 'admin',
                emailVerified: false,
            });
        });
        userId = result.userId;
    });

    test('getUser returns user ID when authenticated', async () => {
        const user = await userIdentity.query(api.users.getUser, {});
        expect(user).toBe(userId);
    });

    test('getUser throws when unauthenticated', async () => {
        await expect(t.query(api.users.getUser, {})).rejects.toThrow(
            /Unauthenticated|User not authenticated/
        );
    });

    test('getAccountDetails returns user email and username', async () => {
        const details = await userIdentity.query(api.users.getAccountDetails, {});
        expect(details?.email).toBe('test@example.com');
        expect(details?.username).toBe('Test User');
    });

    test('getAccountDetails throws when unauthenticated', async () => {
        await expect(t.query(api.users.getAccountDetails, {})).rejects.toThrow(
            /Unauthenticated|User not authenticated/
        );
    });

    test('getUserRole returns role when user has role', async () => {
        await userIdentity.run(async ctx => {
            const userRecord = await ctx.db
                .query('user')
                .withIndex('userId', q => q.eq('userId', userId))
                .first();
            if (userRecord) {
                await ctx.db.patch(userRecord._id, { role: 'admin' } as Record<string, unknown>);
            }
        });

        const role = await userIdentity.query(api.users.getUserRole, {});
        expect(role?.role).toBe('admin');
        expect(role?.userId).toBe(userId);
    });

    test('getUserRole returns null when user has no role', async () => {
        // Remove role from user for this test
        await userIdentity.run(async ctx => {
            const userRecord = await ctx.db
                .query('user')
                .withIndex('userId', q => q.eq('userId', userId))
                .first();
            if (userRecord) {
                await ctx.db.patch(userRecord._id, { role: null } as Record<string, unknown>);
            }
        });

        const role = await userIdentity.query(api.users.getUserRole, {});
        expect(role?.role).toBeNull();
    });

    test('getUserRole throws when unauthenticated', async () => {
        await expect(t.query(api.users.getUserRole, {})).rejects.toThrow(
            /Unauthenticated|User not authenticated/
        );
    });

    test('updateAccountDetails updates username (email change is not allowed here)', async () => {
        const result = await userIdentity.mutation(api.users.updateAccountDetails, {
            email: 'test@example.com',
            username: 'New Name',
        });

        expect(result?.message).toBe('Account details updated');
        expect(result?.error).toBe(false);

        const details = await userIdentity.query(api.users.getAccountDetails, {});
        expect(details?.email).toBe('test@example.com');
        expect(details?.username).toBe('New Name');
    });

    test('updateAccountDetails throws when attempting to change email (must use Better Auth changeEmail)', async () => {
        await expect(
            userIdentity.mutation(api.users.updateAccountDetails, {
                email: 'newemail@example.com',
                username: 'New Name',
            })
        ).rejects.toThrow(/Email changes require verification|changeEmail/i);
    });

    test('updateAccountDetails throws when unauthenticated', async () => {
        await expect(
            t.mutation(api.users.updateAccountDetails, {
                email: 'new@example.com',
                username: 'New',
            })
        ).rejects.toThrow(/Unauthenticated|User not authenticated/);
    });

    test('updateAccountDetails updates updatedAt timestamp', async () => {
        const initialUser = await userIdentity.run(async ctx => {
            return await ctx.db
                .query('user')
                .withIndex('userId', q => q.eq('userId', userId))
                .first();
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        await userIdentity.mutation(api.users.updateAccountDetails, {
            email: 'test@example.com',
            username: 'Updated',
        });

        const updatedUser = await userIdentity.run(async ctx => {
            return await ctx.db
                .query('user')
                .withIndex('userId', q => q.eq('userId', userId))
                .first();
        });

        const initialUpdatedAt = initialUser?.updatedAt;
        const finalUpdatedAt = updatedUser?.updatedAt;
        if (initialUpdatedAt !== undefined && finalUpdatedAt !== undefined) {
            expect(finalUpdatedAt).toBeGreaterThan(initialUpdatedAt);
        }
    });
});
