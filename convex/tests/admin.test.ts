import type { FunctionReturnType } from 'convex/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { api, internal } from '../_generated/api';
import { GLOBAL_ADMIN_ROLE } from '../features/auth/roles';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestOrganization,
    createTestSession,
    createTestUser,
    type TestUserData,
} from './test.helpers';
import { identityFor } from './test.identities';
import { runInAuth } from './authTesting';

const page = { numItems: 20, cursor: null };

type AuditPage = FunctionReturnType<typeof api.admin.listAuditLogs>;

describe('global administration', () => {
    const t = initConvexTest();
    let admin: TestUserData;
    let user: TestUserData;
    let organizationId: string;

    const as = (account: TestUserData) => t.withIdentity(identityFor(account));

    beforeEach(async () => {
        vi.useFakeTimers();
        const suffix = Math.random().toString(36).slice(2, 10);
        organizationId = await createTestOrganization(t, {
            name: `Admin ${suffix}`,
            slug: `admin-${suffix}`,
        });

        admin = await createTestUser(t, {
            userId: `admin-${suffix}`,
            email: `admin-${suffix}@example.com`,
            name: 'Admin',
            role: GLOBAL_ADMIN_ROLE,
        });
        user = await createTestUser(t, {
            userId: `user-${suffix}`,
            email: `user-${suffix}@example.com`,
            name: 'Regular',
            role: 'user',
        });

        await createTestMember(t, { organizationId, userId: admin.docId, role: 'member' });
        await createTestMember(t, { organizationId, userId: user.docId, role: 'member' });
    });

    afterEach(async () => {
        await t.finishAllScheduledFunctions(() => vi.runAllTimers());
        vi.useRealTimers();
    });

    test('only the global admin reaches the admin functions @REQ-ROLES-001 @REQ-ROLES-002 @INH-PER-04', async () => {
        await expect(as(user).query(api.admin.listUsers, { paginationOpts: page })).rejects.toThrow(
            'FORBIDDEN'
        );
        await expect(
            as(user).query(api.admin.listAuditLogs, { paginationOpts: page })
        ).rejects.toThrow('FORBIDDEN');

        const users = await as(admin).query(api.admin.listUsers, { paginationOpts: page });

        expect(users.page.map(entry => entry.email).sort()).toEqual(
            [admin.email, user.email].sort()
        );
    });

    test('promotes and demotes other users, but never the admin themself @REQ-ADMIN-003', async () => {
        await as(admin).mutation(api.admin.setUserRole, {
            userId: user.docId,
            role: GLOBAL_ADMIN_ROLE,
        });
        expect((await runInAuth(t, ctx => ctx.db.get('user', user.docId)))?.role).toBe(
            GLOBAL_ADMIN_ROLE
        );

        await as(admin).mutation(api.admin.setUserRole, { userId: user.docId, role: 'user' });
        expect((await runInAuth(t, ctx => ctx.db.get('user', user.docId)))?.role).toBe('user');

        await expect(
            as(admin).mutation(api.admin.setUserRole, { userId: admin.docId, role: 'user' })
        ).rejects.toThrow('FORBIDDEN');
    });

    test('a ban blocks at once, revokes sessions in batches and an unban clears it @REQ-ADMIN-002 @INH-ADM-03 @INH-ADM-04', async () => {
        await Promise.all(
            Array.from({ length: 150 }, (_, index) =>
                createTestSession(t, {
                    userId: user.docId,
                    activeOrganizationId: organizationId,
                    expiresAt: Date.now() + 60_000,
                    token: `ban-${index}`,
                })
            )
        );

        await as(admin).mutation(api.admin.banUser, {
            userId: user.docId,
            reason: 'Spam',
            durationDays: 7,
        });
        await expect(
            as(user).query(api.objectives.listObjectives, { paginationOpts: page })
        ).rejects.toThrow();

        await t.finishAllScheduledFunctions(() => vi.runAllTimers());

        const sessions = await runInAuth(t, ctx =>
            ctx.db
                .query('session')
                .withIndex('userId', q => q.eq('userId', user.docId))
                .take(5)
        );

        expect(sessions).toEqual([]);

        await as(admin).mutation(api.admin.unbanUser, { userId: user.docId });
        expect(await runInAuth(t, ctx => ctx.db.get('user', user.docId))).toMatchObject({
            banned: false,
            banReason: null,
            banExpires: null,
        });
    });

    test('lists and revokes the sessions of any user @REQ-ADMIN-004 @INH-ADM-02', async () => {
        const sessions = await as(admin).query(api.admin.listUserSessions, {
            userId: user.docId,
            paginationOpts: page,
        });

        expect(sessions.page).toHaveLength(1);

        for (const session of sessions.page) {
            await as(admin).mutation(api.admin.revokeUserSession, { sessionId: session.id });
        }

        expect(
            (
                await as(admin).query(api.admin.listUserSessions, {
                    userId: user.docId,
                    paginationOpts: page,
                })
            ).page
        ).toEqual([]);
    });

    test('records platform and organization actions, filtered by type and organization, and never deletes them @REQ-ADMIN-005 @REQ-NF-004 @INH-ADM-05 @INH-ADM-06', async () => {
        await as(admin).mutation(api.admin.banUser, { userId: user.docId });

        const objectiveId = await as(admin).mutation(api.objectives.createObjective, {
            title: 'Audited',
            startValue: 0,
            targetValue: 10,
        });

        const byType = await as(admin).query(api.admin.listAuditLogs, {
            resourceType: 'user',
            paginationOpts: page,
        });

        expect(byType.page[0]).toMatchObject({
            action: 'user.banned',
            severity: 'critical',
            organizationId: null,
            userName: 'Regular',
            actorName: 'Admin',
        });

        const byOrganization = await as(admin).query(api.admin.listAuditLogs, {
            organizationId,
            paginationOpts: page,
        });

        expect(byOrganization.page.map(entry => [entry.action, entry.resourceId])).toContainEqual([
            'objective.created',
            objectiveId,
        ]);

        await t.mutation(internal.cascades.cascadeOrganizationDeletionInternal, { organizationId });
        await t.finishAllScheduledFunctions(() => vi.runAllTimers());

        const kept = await t.run(ctx =>
            ctx.db
                .query('auditLogs')
                .withIndex('by_organization_createdAt', q => q.eq('organizationId', organizationId))
                .take(5)
        );

        expect(kept.length).toBeGreaterThan(0);
    });

    test('filtering the audit log by organization and type returns full pages of matching entries @REQ-ADMIN-005 @INH-ADM-06', async () => {
        const otherOrganizationId = await createTestOrganization(t, {
            name: 'Other audit organization',
            slug: `other-audit-${Math.random().toString(36).slice(2, 10)}`,
        });

        await t.run(async ctx => {
            for (let index = 0; index < 5; index += 1) {
                for (const [organization, resourceType] of [
                    [organizationId, 'objective'],
                    [otherOrganizationId, 'objective'],
                    [organizationId, 'category'],
                ]) {
                    await ctx.db.insert('auditLogs', {
                        userId: user.docId,
                        organizationId: organization,
                        action: `${resourceType}.created`,
                        resourceType,
                        severity: 'info',
                        createdAt: Date.now() + index,
                    });
                }
            }
        });

        const pages: AuditPage['page'][] = [];
        let cursor: string | null = null;

        for (;;) {
            const result: AuditPage = await as(admin).query(api.admin.listAuditLogs, {
                organizationId,
                resourceType: 'objective',
                paginationOpts: { numItems: 2, cursor },
            });

            pages.push(result.page);

            if (result.isDone) {
                break;
            }

            cursor = result.continueCursor;
        }

        expect(pages.map(entries => entries.length)).toEqual([2, 2, 1]);
        expect(pages.flat().every(entry => entry.organizationId === organizationId)).toBe(true);
        expect(pages.flat().every(entry => entry.resourceType === 'objective')).toBe(true);
    });
});
