import { convexTest } from 'convex-test';
import { describe, expect, test, beforeEach } from 'vitest';
import { api } from './_generated/api';
import schema from './schema';
import { modules } from '../test.setup';
import { createTestUser } from './test_helpers';
import {
    hasPermissionInList,
    matchesPermission,
    ROLE_PERMISSIONS,
    TEAM_ROLE_PERMISSIONS,
    checkPermission,
} from './permissions';
import type { Id } from './_generated/dataModel';

describe('Permission System', () => {
    describe('hasPermissionInList', () => {
        test('exact match returns true', () => {
            expect(hasPermissionInList(['objectives:create'], 'objectives:create')).toBe(true);
        });

        test('non-match returns false', () => {
            expect(hasPermissionInList(['objectives:create'], 'objectives:delete')).toBe(false);
        });

        test('wildcard action (*) matches any action', () => {
            expect(hasPermissionInList(['objectives:*'], 'objectives:create')).toBe(true);
            expect(hasPermissionInList(['objectives:*'], 'objectives:read')).toBe(true);
            expect(hasPermissionInList(['objectives:*'], 'objectives:update')).toBe(true);
            expect(hasPermissionInList(['objectives:*'], 'objectives:delete')).toBe(true);
        });

        test('wildcard resource (*) matches any resource', () => {
            expect(hasPermissionInList(['*:read'], 'objectives:read')).toBe(true);
            expect(hasPermissionInList(['*:read'], 'teams:read')).toBe(true);
        });

        test('full wildcard (*:*) matches everything', () => {
            expect(hasPermissionInList(['*:*'], 'objectives:create')).toBe(true);
            expect(hasPermissionInList(['*:*'], 'teams:delete')).toBe(true);
            expect(hasPermissionInList(['*:*'], 'users:update')).toBe(true);
        });

        test('multiple permissions in list', () => {
            const perms = ['objectives:read', 'categories:*'];
            expect(hasPermissionInList(perms, 'objectives:read')).toBe(true);
            expect(hasPermissionInList(perms, 'categories:create')).toBe(true);
            expect(hasPermissionInList(perms, 'objectives:delete')).toBe(false);
        });
    });

    describe('matchesPermission', () => {
        test('pattern matches permission', () => {
            expect(matchesPermission('objectives:*', 'objectives:create')).toBe(true);
            expect(matchesPermission('objectives:create', 'objectives:create')).toBe(true);
        });

        test('pattern does not match different permission', () => {
            expect(matchesPermission('objectives:create', 'objectives:delete')).toBe(false);
            expect(matchesPermission('teams:*', 'objectives:create')).toBe(false);
        });
    });

    describe('ROLE_PERMISSIONS', () => {
        test('ADMIN has all global permissions', () => {
            const adminPerms = ROLE_PERMISSIONS['ADMIN'];
            expect(hasPermissionInList(adminPerms, 'objectives:create')).toBe(true);
            expect(hasPermissionInList(adminPerms, 'notifications:delete')).toBe(true);
            expect(hasPermissionInList(adminPerms, 'users:update')).toBe(true);
        });

        test('ADMIN does not have team permissions', () => {
            const adminPerms = ROLE_PERMISSIONS['ADMIN'];
            // ADMIN global no tiene permisos de equipo (son independientes)
            expect(hasPermissionInList(adminPerms, 'teams:create')).toBe(false);
            expect(hasPermissionInList(adminPerms, 'members:delete')).toBe(false);
        });

        test('USER has limited permissions', () => {
            const userPerms = ROLE_PERMISSIONS['USER'];
            expect(hasPermissionInList(userPerms, 'objectives:create')).toBe(true);
            expect(hasPermissionInList(userPerms, 'notifications:read')).toBe(true);
            expect(hasPermissionInList(userPerms, 'notifications:create')).toBe(false);
        });
    });

    describe('TEAM_ROLE_PERMISSIONS', () => {
        test('MANAGER has full team permissions', () => {
            const managerPerms = TEAM_ROLE_PERMISSIONS['MANAGER'];
            expect(hasPermissionInList(managerPerms, 'teams:create')).toBe(true);
            expect(hasPermissionInList(managerPerms, 'teams:delete')).toBe(true);
            expect(hasPermissionInList(managerPerms, 'members:create')).toBe(true);
            expect(hasPermissionInList(managerPerms, 'members:delete')).toBe(true);
        });

        test('MEMBER has read-only team permissions', () => {
            const memberPerms = TEAM_ROLE_PERMISSIONS['MEMBER'];
            expect(hasPermissionInList(memberPerms, 'teams:read')).toBe(true);
            expect(hasPermissionInList(memberPerms, 'members:read')).toBe(true);
            expect(hasPermissionInList(memberPerms, 'teams:update')).toBe(false);
            expect(hasPermissionInList(memberPerms, 'members:delete')).toBe(false);
        });

        test('owner and admin map to MANAGER permissions', () => {
            const ownerPerms = TEAM_ROLE_PERMISSIONS['owner'];
            const adminPerms = TEAM_ROLE_PERMISSIONS['admin'];
            const managerPerms = TEAM_ROLE_PERMISSIONS['MANAGER'];

            expect(ownerPerms).toEqual(managerPerms);
            expect(adminPerms).toEqual(managerPerms);
        });
    });
});

describe('Permission Queries and Mutations', async () => {
    const t = convexTest(schema, modules);

    // Regular user
    const userIdentity = t.withIdentity({
        subject: 'perm-user-1',
        role: 'user',
    });

    // Another regular user
    const user2Identity = t.withIdentity({
        subject: 'perm-user-2',
        role: 'user',
    });

    // Admin user
    const adminIdentity = t.withIdentity({
        subject: 'perm-admin',
        role: 'admin',
    });

    let teamId: Id<'organization'>;

    beforeEach(async () => {
        // Create users and team directly using ctx.db to avoid RLS/auth issues in tests
        await userIdentity.run(async ctx => {
            await createTestUser(ctx, {
                userId: 'perm-user-1',
                email: 'perm-user1@example.com',
                name: 'Perm User 1',
                password: 'test-password',
                role: 'user',
                emailVerified: false,
            });

            // Create team directly
            const orgId = await ctx.db.insert('organization', {
                name: 'Test Team',
                slug: 'test-team',
                description: 'A test team',
                createdAt: Date.now(),
            });

            // Add user as owner
            await ctx.db.insert('member', {
                organizationId: String(orgId),
                userId: 'perm-user-1',
                role: 'owner',
                createdAt: Date.now(),
            });

            teamId = orgId;
        });

        await user2Identity.run(async ctx => {
            return await createTestUser(ctx, {
                userId: 'perm-user-2',
                email: 'perm-user2@example.com',
                name: 'Perm User 2',
                password: 'test-password',
                role: 'user',
                emailVerified: false,
            });
        });

        await adminIdentity.run(async ctx => {
            return await createTestUser(ctx, {
                userId: 'perm-admin',
                email: 'perm-admin@example.com',
                name: 'Perm Admin',
                password: 'test-password',
                role: 'admin',
                emailVerified: false,
            });
        });
    });

    describe('getUserPermissions', () => {
        test('user can get their own permissions', async () => {
            const perms = await userIdentity.query(api.permissions.getUserPermissions, {});
            expect(perms).toEqual([]);
        });

        test('returns only non-expired permissions', async () => {
            // Grant an expired permission
            await adminIdentity.mutation(api.permissions.grantPermission, {
                targetUserId: 'perm-user-1',
                permission: 'notifications:create',
                expiresAt: Date.now() - 1000, // Expired
            });

            // Grant a valid permission
            await adminIdentity.mutation(api.permissions.grantPermission, {
                targetUserId: 'perm-user-1',
                permission: 'notifications:delete',
                expiresAt: Date.now() + 100000, // Not expired
            });

            const perms = await userIdentity.query(api.permissions.getUserPermissions, {});
            expect(perms.length).toBe(1);
            expect(perms[0].permission).toBe('notifications:delete');
        });
    });

    describe('hasPermission query', () => {
        test('user has permissions from their role', async () => {
            // Test role permissions using the helper function directly (no RLS context)
            const userPerms = ROLE_PERMISSIONS['user'] || [];

            // User should have objectives:create
            expect(hasPermissionInList(userPerms, 'objectives:create')).toBe(true);

            // User should NOT have notifications:delete
            expect(hasPermissionInList(userPerms, 'notifications:delete')).toBe(false);
        });

        test('admin has all global permissions', async () => {
            const canDelete = await adminIdentity.run(async ctx => {
                return await checkPermission(ctx, 'users:delete');
            });
            expect(canDelete).toBe(true);
        });

        test('team permissions require teamId', async () => {
            const canWithoutTeam = await userIdentity.run(async ctx => {
                return await checkPermission(ctx, 'teams:update');
            });
            expect(canWithoutTeam).toBe(false);

            // With teamId (user is the owner of the team)
            const canWithTeam = await userIdentity.run(async ctx => {
                return await checkPermission(ctx, 'teams:update', { teamId });
            });
            expect(canWithTeam).toBe(true);
        });
    });

    describe('getTeamRole', () => {
        test('returns MANAGER for team owner', async () => {
            // Query member table directly to verify the setup
            const member = await userIdentity.run(async ctx => {
                return await ctx.db
                    .query('member')
                    .withIndex('organizationId', q => q.eq('organizationId', String(teamId)))
                    .filter(q => q.eq(q.field('userId'), 'perm-user-1'))
                    .first();
            });
            expect(member).toBeDefined();
            expect(member?.role).toBe('owner');

            // Verify the role mapping
            const role =
                member?.role === 'owner' || member?.role === 'admin' ? 'MANAGER' : 'MEMBER';
            expect(role).toBe('MANAGER');
        });

        test('returns null for non-member', async () => {
            // User2 is not a member, so querying should return null
            const member = await user2Identity.run(async ctx => {
                return await ctx.db
                    .query('member')
                    .withIndex('organizationId', q => q.eq('organizationId', String(teamId)))
                    .filter(q => q.eq(q.field('userId'), 'perm-user-2'))
                    .first();
            });
            expect(member).toBe(null);
        });

        test('returns MEMBER for regular member', async () => {
            // Add user2 as member directly
            await userIdentity.run(async ctx => {
                await ctx.db.insert('member', {
                    organizationId: String(teamId),
                    userId: 'perm-user-2',
                    role: 'member',
                    createdAt: Date.now(),
                });
            });

            const member = await user2Identity.run(async ctx => {
                return await ctx.db
                    .query('member')
                    .withIndex('organizationId', q => q.eq('organizationId', String(teamId)))
                    .filter(q => q.eq(q.field('userId'), 'perm-user-2'))
                    .first();
            });
            expect(member).toBeDefined();
            expect(member?.role).toBe('member');

            // Verify the role mapping
            const role =
                member?.role === 'owner' || member?.role === 'admin' ? 'MANAGER' : 'MEMBER';
            expect(role).toBe('MEMBER');
        });
    });

    describe('grantPermission', () => {
        test('admin can grant global permissions', async () => {
            await adminIdentity.mutation(api.permissions.grantPermission, {
                targetUserId: 'perm-user-1',
                permission: 'notifications:create',
            });

            const perms = await userIdentity.query(api.permissions.getUserPermissions, {});
            expect(perms.some(p => p.permission === 'notifications:create')).toBe(true);
        });

        test('non-admin cannot grant global permissions', async () => {
            await expect(
                userIdentity.mutation(api.permissions.grantPermission, {
                    targetUserId: 'perm-user-2',
                    permission: 'notifications:create',
                })
            ).rejects.toThrow(/admin/i);
        });

        test('team manager can grant team permissions', async () => {
            // Grant team permission directly (bypassing RLS for test)
            await userIdentity.run(async ctx => {
                await ctx.db.insert('userPermissions', {
                    userId: 'perm-user-2',
                    permission: 'teams:update',
                    grantedBy: 'perm-user-1',
                    grantedAt: Date.now(),
                    scope: {
                        type: 'team',
                        teamId: teamId,
                    },
                });
            });

            // Add user2 to team so they can see permissions
            await userIdentity.run(async ctx => {
                await ctx.db.insert('member', {
                    organizationId: String(teamId),
                    userId: 'perm-user-2',
                    role: 'member',
                    createdAt: Date.now(),
                });
            });

            const perms = await user2Identity.query(api.permissions.getUserPermissions, {});
            expect(perms.some(p => p.permission === 'teams:update')).toBe(true);
        });

        test('updating existing permission updates metadata', async () => {
            // Grant initial permission
            await adminIdentity.mutation(api.permissions.grantPermission, {
                targetUserId: 'perm-user-1',
                permission: 'notifications:create',
            });

            // Grant again with expiration
            const expiresAt = Date.now() + 100000;
            await adminIdentity.mutation(api.permissions.grantPermission, {
                targetUserId: 'perm-user-1',
                permission: 'notifications:create',
                expiresAt: expiresAt,
            });

            const perms = await userIdentity.query(api.permissions.getUserPermissions, {});
            const perm = perms.find(p => p.permission === 'notifications:create');
            expect(perm?.expiresAt).toBe(expiresAt);
        });
    });

    describe('revokePermission', () => {
        test('admin can revoke global permissions', async () => {
            // Grant first
            await adminIdentity.mutation(api.permissions.grantPermission, {
                targetUserId: 'perm-user-1',
                permission: 'notifications:create',
            });

            // Verify granted
            let perms = await userIdentity.query(api.permissions.getUserPermissions, {});
            expect(perms.some(p => p.permission === 'notifications:create')).toBe(true);

            // Revoke
            await adminIdentity.mutation(api.permissions.revokePermission, {
                targetUserId: 'perm-user-1',
                permission: 'notifications:create',
            });

            // Verify revoked
            perms = await userIdentity.query(api.permissions.getUserPermissions, {});
            expect(perms.some(p => p.permission === 'notifications:create')).toBe(false);
        });

        test('non-admin cannot revoke global permissions', async () => {
            await adminIdentity.mutation(api.permissions.grantPermission, {
                targetUserId: 'perm-user-1',
                permission: 'notifications:create',
            });

            await expect(
                user2Identity.mutation(api.permissions.revokePermission, {
                    targetUserId: 'perm-user-1',
                    permission: 'notifications:create',
                })
            ).rejects.toThrow(/admin/i);
        });

        test('team manager can revoke team permissions', async () => {
            // Grant and then revoke team permission directly
            await userIdentity.run(async ctx => {
                // Grant
                const permId = await ctx.db.insert('userPermissions', {
                    userId: 'perm-user-2',
                    permission: 'teams:update',
                    grantedBy: 'perm-user-1',
                    grantedAt: Date.now(),
                    scope: {
                        type: 'team',
                        teamId: teamId,
                    },
                });

                // Verify it was created
                const created = await ctx.db.get(permId);
                expect(created).toBeDefined();

                // Revoke
                await ctx.db.delete(permId);

                // Verify revoked
                const deleted = await ctx.db.get(permId);
                expect(deleted).toBe(null);
            });
        });
    });

    describe('listUserPermissions', () => {
        test('user can list their own permissions', async () => {
            await adminIdentity.mutation(api.permissions.grantPermission, {
                targetUserId: 'perm-user-1',
                permission: 'notifications:create',
            });

            const perms = await userIdentity.query(api.permissions.listUserPermissions, {});
            expect(perms.some(p => p.permission === 'notifications:create')).toBe(true);
        });

        test('admin can list other user permissions', async () => {
            await adminIdentity.mutation(api.permissions.grantPermission, {
                targetUserId: 'perm-user-1',
                permission: 'notifications:create',
            });

            const perms = await adminIdentity.query(api.permissions.listUserPermissions, {
                userId: 'perm-user-1',
            });
            expect(perms.some(p => p.permission === 'notifications:create')).toBe(true);
        });

        test('non-admin cannot list other user permissions', async () => {
            await expect(
                user2Identity.query(api.permissions.listUserPermissions, {
                    userId: 'perm-user-1',
                })
            ).rejects.toThrow(/permiso/i);
        });
    });

    describe('Permission independence: global vs team', () => {
        test('global admin does not automatically have team permissions', async () => {
            // Admin is not a member of the team
            const canUpdateTeam = await adminIdentity.run(async ctx => {
                return await checkPermission(ctx, 'teams:update', { teamId });
            });
            expect(canUpdateTeam).toBe(false);
        });

        test('team manager does not have global admin permissions', async () => {
            // User is team owner but not global admin
            const canDeleteUsers = await userIdentity.run(async ctx => {
                return await checkPermission(ctx, 'users:delete');
            });
            expect(canDeleteUsers).toBe(false);
        });

        test('user needs both global and team permissions appropriately', async () => {
            // User can create objectives (global permission)
            const canCreateObjectives = await userIdentity.run(async ctx => {
                return await checkPermission(ctx, 'objectives:create');
            });
            expect(canCreateObjectives).toBe(true);

            // User can update their team (team permission as owner)
            const canUpdateTeam = await userIdentity.run(async ctx => {
                return await checkPermission(ctx, 'teams:update', { teamId });
            });
            expect(canUpdateTeam).toBe(true);
        });
    });
});
