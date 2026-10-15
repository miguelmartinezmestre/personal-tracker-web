import { beforeEach, describe, expect, test } from 'vitest';
import { api, internal } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { DEFAULT_CATEGORIES } from '../constants';
import {
    createTestUser,
    createTestOrganization,
    createTestMember,
    createTestSession,
} from './test.helpers';
import type { Id } from '../_generated/dataModel';
import { asInvalidArg } from './test.casts';
import { z } from 'zod';

const sessionCreateResultSchema = z.object({
    _id: z.string().optional(),
    id: z.string().optional(),
});

describe('convex auth', () => {
    const t = initConvexTest();
    let userId: Id<'user'>;
    let _organizationId: Id<'organization'>;

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

    test('auth triggersApi writes audit logs for session create and delete', async () => {
        const sessionDoc = {
            expiresAt: Date.now() + 60_000,
            token: 'session-trigger-token',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            ipAddress: '127.0.0.1',
            userAgent: 'Vitest',
            userId: String(userId),
            impersonatedBy: null,
            activeOrganizationId: String(_organizationId),
        };

        const createdSession = asInvalidArg<Record<string, unknown>>(
            // oxlint-disable-next-line typescript/no-unsafe-argument -- generated Better Auth adapter returns an untyped document
            await t.mutation(internal.generated.auth.create, {
                input: {
                    model: 'session',
                    data: sessionDoc,
                },
            })
        );
        const parsedSession = sessionCreateResultSchema.safeParse(createdSession);
        if (!parsedSession.success) {
            throw new Error('Expected session create result');
        }
        const sessionId = parsedSession.data._id ?? parsedSession.data.id;
        if (!sessionId) {
            throw new Error('Expected session id');
        }

        await t.mutation(internal.generated.auth.deleteOne, {
            input: {
                model: 'session',
                where: [{ field: 'token', operator: 'eq', value: sessionDoc.token }],
            },
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

    test('default organization created for a user is protected', async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);
        const user = await createTestUser(t, {
            userId: `default-org-user-${randomSuffix}`,
            email: `default-org-user-${randomSuffix}@example.com`,
            name: 'Default Org User',
        });

        const organizationId = await t.mutation(internal.auth.ensureDefaultOrganizationForUser, {
            userId: user.docId,
        });

        const organization = await t.run(
            async ctx => await ctx.db.get('organization', organizationId)
        );
        expect(organization?.metadata).toBe(
            JSON.stringify({ type: 'personal', ownerUserId: user.docId })
        );

        const isDefaultOrganization = await t.query(internal.auth.isDefaultOrganization, {
            organizationId,
        });

        expect(isDefaultOrganization).toBe(true);
        expect(
            await t.query(internal.auth.isDefaultOrganization, { organizationId: _organizationId })
        ).toBe(false);

        // Runs on every sign-in: later calls reuse the organization instead of creating another.
        await expect(
            t.mutation(internal.auth.ensureDefaultOrganizationForUser, { userId: user.docId })
        ).resolves.toBe(organizationId);
        const memberships = await t.run(ctx =>
            ctx.db
                .query('member')
                .withIndex('userId', q => q.eq('userId', user.docId))
                .collect()
        );
        expect(memberships).toHaveLength(1);
    });

    test('default organization starts with the default categories once', async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);
        const user = await createTestUser(t, {
            userId: `default-categories-user-${randomSuffix}`,
            email: `default-categories-user-${randomSuffix}@example.com`,
            name: 'Default Categories User',
        });

        const organizationId = await t.mutation(internal.auth.ensureDefaultOrganizationForUser, {
            userId: user.docId,
        });
        await t.mutation(internal.categories.seedDefaultCategories, { organizationId });

        const categories = await t.run(
            async ctx =>
                await ctx.db
                    .query('categories')
                    .withIndex('by_organization', q => q.eq('organizationId', organizationId))
                    .take(50)
        );
        expect(categories.map(category => category.name).sort()).toEqual(
            DEFAULT_CATEGORIES.map(category => category.name).sort()
        );
    });

    test('detects an organization name the user already has, ignoring case', async () => {
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
            t.query(internal.auth.userHasOrganizationNamed, {
                userId: user.docId,
                name,
                ...(excludeOrganizationId ? { excludeOrganizationId } : {}),
            });
        expect(await check('  acme team ')).toBe(true);
        expect(await check('Other team')).toBe(false);
        // Renaming an organization to its own name is not a duplicate.
        expect(await check('Acme Team', organizationId)).toBe(false);
    });

    test('listOrganizations and getPersonalOrganizationId find the personal organization', async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);
        const user = await createTestUser(t, {
            userId: `personal-org-list-user-${randomSuffix}`,
            email: `personal-org-list-user-${randomSuffix}@example.com`,
            name: 'Personal Org List User',
        });

        const personalOrganizationId = await t.mutation(
            internal.auth.ensureDefaultOrganizationForUser,
            {
                userId: user.docId,
            }
        );

        const sessionId = await createTestSession(t, {
            userId: user.docId,
            activeOrganizationId: personalOrganizationId,
            expiresAt: Date.now() + 60_000,
            token: `personal-org-list-session-${randomSuffix}`,
        });

        const personalOrgIdentity = t.withIdentity({
            subject: user.docId,
            sessionId,
            role: 'user',
            email: user.email,
            name: user.name,
            password: 'test-password',
            emailVerified: false,
            createdAt: Date.now(),
            userId: user.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });

        const organizations = await personalOrgIdentity.query(api.organizations.listOrganizations, {
            paginationOpts: { numItems: 20, cursor: null },
        });

        const personalOrganization = organizations.page.find(
            organization => organization.id === personalOrganizationId
        );

        expect(personalOrganization?.isPersonal).toBe(true);
        await expect(
            personalOrgIdentity.query(api.organizations.getPersonalOrganizationId, {})
        ).resolves.toBe(personalOrganizationId);
    });
});
