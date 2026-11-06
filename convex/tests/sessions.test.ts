import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { api } from '../_generated/api';
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

describe('own sessions', () => {
    const t = initConvexTest();
    let user: TestUserData;
    let other: TestUserData;
    let organizationId: string;

    beforeEach(async () => {
        vi.useFakeTimers();
        const suffix = Math.random().toString(36).slice(2, 10);
        organizationId = await createTestOrganization(t, {
            name: `Sessions ${suffix}`,
            slug: `sessions-${suffix}`,
        });

        for (const label of ['user', 'other']) {
            const created = await createTestUser(t, {
                userId: `${label}-${suffix}`,
                email: `${label}-${suffix}@example.com`,
                name: label,
            });

            await createTestMember(t, { organizationId, userId: created.docId, role: 'member' });

            if (label === 'user') {
                user = created;
            } else {
                other = created;
            }
        }
    });

    afterEach(async () => {
        await t.finishAllScheduledFunctions(() => vi.runAllTimers());
        vi.useRealTimers();
    });

    const addSessions = (owner: TestUserData, count: number) =>
        Promise.all(
            Array.from({ length: count }, (_, index) =>
                createTestSession(t, {
                    userId: owner.docId,
                    activeOrganizationId: organizationId,
                    expiresAt: Date.now() + 60_000,
                    token: `extra-${String(owner.docId)}-${index}`,
                })
            )
        );

    const sessionCount = (owner: TestUserData) =>
        runInAuth(
            t,
            async ctx =>
                (
                    await ctx.db
                        .query('session')
                        .withIndex('userId', q => q.eq('userId', owner.docId))
                        .take(500)
                ).length
        );

    test('lists the own sessions with their device data and marks the current one @REQ-AUTENTICACION-006 @REQ-AUTENTICACION-007 @INH-AUT-09', async () => {
        await addSessions(user, 2);

        const { page } = await t
            .withIdentity(identityFor(user))
            .query(api.sessions.listMySessions, { paginationOpts: { numItems: 10, cursor: null } });

        expect(page).toHaveLength(3);
        expect(page.filter(session => session.isCurrent)).toHaveLength(1);
        expect(page[0]).toHaveProperty('userAgent');
    });

    test('revokes its own sessions but never those of another user @REQ-AUTENTICACION-007 @REQ-NF-003', async () => {
        const [mine] = await addSessions(user, 1);
        const [theirs] = await addSessions(other, 1);

        if (!mine || !theirs) {
            throw new Error('Sessions were not created');
        }

        const asUser = t.withIdentity(identityFor(user));

        await asUser.mutation(api.sessions.revokeSession, { sessionId: mine });
        await expect(
            asUser.mutation(api.sessions.revokeSession, { sessionId: theirs })
        ).rejects.toThrow('FORBIDDEN');

        expect(await sessionCount(user)).toBe(1);
        expect(await sessionCount(other)).toBe(2);
    });

    test('closes every other session in batches of 100, keeping the current one @REQ-AUTENTICACION-008 @INH-AUT-10', async () => {
        await addSessions(user, 250);
        await addSessions(other, 3);

        const result = await t
            .withIdentity(identityFor(user))
            .mutation(api.sessions.revokeOtherSessions, {});

        expect(result.revokedCount).toBe(100);
        await t.finishAllScheduledFunctions(() => vi.runAllTimers());

        expect(await sessionCount(user)).toBe(1);
        expect(await sessionCount(other)).toBe(4);
    });
});
