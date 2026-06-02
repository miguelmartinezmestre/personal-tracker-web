import { beforeEach, describe, expect, test } from 'vitest';
import { api, internal } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestUser, createTestOrganization, createTestMember } from './test_helpers';
import { TestConvexForDataModel } from 'convex-test';
import { DataModel, Id } from '../_generated/dataModel';
import { buildDefaultOrganizationSlug } from '../domain/organizations/personalOrganization';

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
            role: 'admin',
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

        const createdSession = (await t.mutation(internal.generated.auth.create, {
            input: {
                model: 'session',
                data: sessionDoc,
            },
        })) as { _id?: string; id?: string };

        const sessionId = createdSession._id ?? createdSession.id;

        await t.mutation(internal.generated.auth.deleteOne, {
            input: {
                model: 'session',
                where: [{ field: 'token', operator: 'eq', value: sessionDoc.token }],
            },
        });

        const adminLogs = await userIdentity.query(api.auditLogs.getAuditLogs, {
            paginationOpts: { numItems: 50, cursor: null },
        });

        expect(
            adminLogs.page.some(
                log =>
                    log.action === 'session.created' &&
                    log.resourceType === 'session' &&
                    log.resourceId === sessionId
            )
        ).toBe(true);

        expect(
            adminLogs.page.some(
                log =>
                    log.action === 'session.deleted' &&
                    log.resourceType === 'session' &&
                    log.resourceId === sessionId
            )
        ).toBe(true);

        const sessionLogs = adminLogs.page.filter(log => log.resourceId === sessionId);
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

        const organization = await t.run(async ctx => await ctx.db.get(organizationId));
        expect(organization?.metadata).toBe(JSON.stringify({ type: 'personal' }));

        const isDefaultOrganization = await t.query(internal.auth.isDefaultOrganization, {
            organizationId,
        });

        expect(isDefaultOrganization).toBe(true);
    });

    test('legacy default organization slug is protected', async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);
        const user = await createTestUser(t, {
            userId: `legacy-default-org-user-${randomSuffix}`,
            email: `legacy-default-org-user-${randomSuffix}@example.com`,
            name: 'Legacy Default Org User',
        });
        const organizationId = await createTestOrganization(t, {
            name: 'Renamed Personal Organization',
            slug: buildDefaultOrganizationSlug(user.docId),
        });
        await createTestMember(t, {
            organizationId,
            userId: user.docId,
            role: 'owner',
        });

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
});
