import { beforeEach, describe, expect, test } from 'vitest';
import { createFunctionHandle } from 'convex/server';
import { components, internal } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestUser, createTestOrganization, createTestMember } from './test.helpers';
import { z } from 'zod';
import { runInAuth } from './authTesting';
import {
    isDefaultOrganization,
    userHasOrganizationNamed,
} from '../features/organizations/memberships';

const sessionCreateResultSchema = z.object({
    _id: z.string().optional(),
    id: z.string().optional(),
});

describe('convex auth', () => {
    const t = initConvexTest();
    let userId: string;
    let _organizationId: string;

    beforeEach(async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);

        const userData = await createTestUser(t, {
            userId: 'test-user-123-' + randomSuffix,
            email: 'test@example.com-' + randomSuffix,
            name: 'Test User ' + randomSuffix,
            password: 'test-password',
            role: 'globalAdmin',
            emailVerified: false,
        });

        userId = userData.docId;

        const orgId = await createTestOrganization(t, {
            name: 'Auth Org ' + randomSuffix,
            slug: 'auth-org-' + randomSuffix,
        });

        await createTestMember(t, {
            organizationId: orgId,
            userId,
            role: 'owner',
        });

        _organizationId = orgId;
    });

    test('auth triggersApi writes audit logs for session create and delete @REQ-NF-004 @INH-ADM-05', async () => {
        const sessionDoc = {
            expiresAt: Date.now() + 60_000,
            token: 'session-trigger-token',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            ipAddress: '127.0.0.1',
            userAgent: 'Vitest',
            userId,
            impersonatedBy: null,
            activeOrganizationId: _organizationId,
        };

        const parsedSession = sessionCreateResultSchema.safeParse(
            await t.run(async ctx => {
                const created: unknown = await ctx.runMutation(
                    components.betterAuth.adapter.create,
                    {
                        input: { model: 'session', data: sessionDoc },
                        onCreateHandle: await createFunctionHandle(internal.auth.onCreate),
                    }
                );

                return created;
            })
        );

        if (!parsedSession.success) {
            throw new Error('Expected session create result');
        }

        const sessionId = parsedSession.data._id ?? parsedSession.data.id;

        if (!sessionId) {
            throw new Error('Expected session id');
        }

        await t.run(async ctx => {
            await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
                input: {
                    model: 'session',
                    where: [{ field: 'token', operator: 'eq', value: sessionDoc.token }],
                },
                onDeleteHandle: await createFunctionHandle(internal.auth.onDelete),
            });
        });

        const adminLogs = await t.run(async ctx => {
            return await ctx.db.query('auditLogs').withIndex('by_createdAt').order('desc').take(50);
        });

        expect(
            adminLogs.some(
                log =>
                    log.action === 'session.created' &&
                    log.resourceType === 'session' &&
                    log.resourceId === sessionId
            )
        ).toBe(true);

        expect(
            adminLogs.some(
                log =>
                    log.action === 'session.deleted' &&
                    log.resourceType === 'session' &&
                    log.resourceId === sessionId
            )
        ).toBe(true);

        const sessionLogs = adminLogs.filter(log => log.resourceId === sessionId);

        for (const log of sessionLogs) {
            expect(log.metadata?.before ?? {}).not.toHaveProperty('token');
            expect(log.metadata?.after ?? {}).not.toHaveProperty('token');
            expect(log.metadata?.before ?? {}).not.toHaveProperty('ipAddress');
            expect(log.metadata?.after ?? {}).not.toHaveProperty('ipAddress');
            expect(log.metadata?.before ?? {}).not.toHaveProperty('userAgent');
            expect(log.metadata?.after ?? {}).not.toHaveProperty('userAgent');
            expect(log.metadata?.before ?? log.metadata?.after).toHaveProperty('userId');
        }
    });

    test('default organization created for a user is protected @INH-ORG-01 @INH-ORG-02', async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);

        const user = await createTestUser(t, {
            userId: `default-org-user-${randomSuffix}`,
            email: `default-org-user-${randomSuffix}@example.com`,
            name: 'Default Org User',
        });

        const ensureDefault = () =>
            t.mutation(internal.auth.ensureDefaultOrganization, { userId: user.docId });

        const isDefault = (organizationId: string) =>
            t.run(ctx => isDefaultOrganization(ctx, organizationId));

        const organizationId = await ensureDefault();

        expect(await isDefault(organizationId)).toBe(true);
        expect(await isDefault(_organizationId)).toBe(false);
        await expect(ensureDefault()).resolves.toBe(organizationId);

        const memberships = await runInAuth(t, ctx =>
            ctx.db
                .query('member')
                .withIndex('userId', q => q.eq('userId', user.docId))
                .collect()
        );

        expect(memberships).toHaveLength(1);
    });

    test('detects an organization name the user already has, ignoring case @REQ-EQUIPOS-001 @REQ-EQUIPOS-007', async () => {
        const suffix = Math.random().toString(36).slice(2, 10);

        const user = await createTestUser(t, {
            userId: `org-name-user-${suffix}`,
            email: `org-name-user-${suffix}@example.com`,
            name: 'Org Name User',
        });

        const organizationId = await createTestOrganization(t, {
            name: 'Acme Team',
            slug: `acme-team-${suffix}`,
        });

        await createTestMember(t, { organizationId, userId: user.docId, role: 'owner' });

        const check = (name: string, excludeOrganizationId?: string) =>
            t.run(ctx =>
                userHasOrganizationNamed(ctx, { userId: user.docId, name, excludeOrganizationId })
            );

        expect(await check('  acme team ')).toBe(true);
        expect(await check('Other team')).toBe(false);
        expect(await check('Acme Team', organizationId)).toBe(false);
    });
});
