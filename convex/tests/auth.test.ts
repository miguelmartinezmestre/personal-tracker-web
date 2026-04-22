/// <reference types="vite/client" />
import { beforeEach, describe, expect, test } from 'vitest';
import { api, internal } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestUser, createTestOrganization, createTestMember } from './test_helpers';
import { TestConvexForDataModel } from 'convex-test';
import { DataModel, Id } from '../_generated/dataModel';

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
            _id: 'session-trigger-test',
            _creationTime: Date.now(),
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

        await t.mutation(internal.auth.onCreate, {
            model: 'session',
            doc: sessionDoc,
        });

        await t.mutation(internal.auth.onDelete, {
            model: 'session',
            doc: sessionDoc,
        });

        const adminLogs = await userIdentity.query(api.auditLogs.getAuditLogs, {
            paginationOpts: { numItems: 50, cursor: null },
        });

        expect(
            adminLogs.page.some(
                log =>
                    log.action === 'session.created' &&
                    log.resourceType === 'session' &&
                    log.resourceId === sessionDoc._id
            )
        ).toBe(true);

        expect(
            adminLogs.page.some(
                log =>
                    log.action === 'session.deleted' &&
                    log.resourceType === 'session' &&
                    log.resourceId === sessionDoc._id
            )
        ).toBe(true);
    });
});
