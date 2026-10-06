import { beforeEach, describe, expect, test } from 'vitest';
import { api, internal } from '../_generated/api';
import { initConvexTest } from './test.helper';
import {
    createTestUser,
    createTestOrganization,
    createTestMember,
    createTestSession,
} from './test.helpers';
import type { TestConvexForDataModel } from 'convex-test';
import type { DataModel, Id } from '../_generated/dataModel';
import { asInvalidArg } from './test.casts';
import { z } from 'zod';
import {
    getPersonalOrganizationOwnerUserId,
    isPersonalOrganizationMetadata,
} from '../personalOrganization';

const sessionCreateResultSchema = z.object({
    _id: z.string().optional(),
    id: z.string().optional(),
});

describe('convex auth', () => {
    const t = initConvexTest();
    let userIdentity: TestConvexForDataModel<DataModel>;
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

        userIdentity = t.withIdentity({
            subject: userData.docId,
            role: userData.role ?? 'globalAdmin',
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

    test('getCurrentUser throws when unauthenticated', async () => {
        await expect(t.query(api.auth.getCurrentUser, {})).rejects.toThrow(
            /Unauthenticated|AUTH_REQUIRED/
        );
    });

    test('getCurrentUser returns user when authenticated', async () => {
        const current = await userIdentity.query(api.auth.getCurrentUser, {});
        expect(current).not.toBeNull();
        expect(current?.name).toBeDefined();
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
    });

    test('regular organization is not protected as default organization', async () => {
        const isDefaultOrganization = await t.query(internal.auth.isDefaultOrganization, {
            organizationId: _organizationId,
        });

        expect(isDefaultOrganization).toBe(false);
    });

    test('getOrganizationsPage marks the metadata-owned organization as personal', async () => {
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

        const organizations = await personalOrgIdentity.query(
            api.organizations.getOrganizationsPage,
            {
                paginationOpts: { numItems: 10, cursor: null },
            }
        );

        const personalOrganization = organizations.page.find(
            organization => organization.id === personalOrganizationId
        );

        expect(personalOrganization?.isPersonal).toBe(true);
    });
});

describe('personal organization metadata', () => {
    test('recognizes personal metadata even when its optional owner ID is malformed', () => {
        const metadata = JSON.stringify({ type: 'personal', ownerUserId: 17 });

        expect(isPersonalOrganizationMetadata(metadata)).toBe(true);
        expect(getPersonalOrganizationOwnerUserId(metadata)).toBeNull();
    });

    test('does not recognize invalid JSON as personal metadata', () => {
        expect(isPersonalOrganizationMetadata('{invalid json')).toBe(false);
    });
});
