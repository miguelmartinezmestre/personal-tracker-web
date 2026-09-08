import { beforeEach, describe, expect, test } from 'vitest';
import { internal } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestMember, createTestOrganization, createTestUser } from './test_helpers';
import type { Id } from '../_generated/dataModel';

describe('auditLogs security', () => {
    const t = initConvexTest();
    let userId: Id<'user'>;
    let organizationId: Id<'organization'>;
    let adminIdentity: ReturnType<typeof t.withIdentity>;

    beforeEach(async () => {
        const random = Math.random().toString(36).substring(2, 15);
        const adminData = await createTestUser(t, {
            userId: 'test-admin-audit-security-' + random,
            email: 'admin-audit-security@example.com-' + random,
            name: 'Admin Audit Security ' + random,
            password: 'test-password',
            role: 'globalAdmin',
            emailVerified: true,
        });
        userId = adminData.docId;

        organizationId = await createTestOrganization(t, {
            name: 'Audit Security Org ' + random,
            slug: 'audit-security-org-' + random,
        });
        await createTestMember(t, { organizationId, userId, role: 'owner' });

        adminIdentity = t.withIdentity({
            subject: adminData.docId,
            role: adminData.role ?? 'globalAdmin',
            email: adminData.email,
            name: adminData.name,
            password: 'test-password',
            emailVerified: true,
            createdAt: Date.now(),
            userId: adminData.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });
    });

    test('recordAuditLog redacts sensitive fields and keeps safe primitive metadata', async () => {
        await adminIdentity.run(async ctx => {
            await ctx.runMutation(internal.auditLogs.recordAuditLog, {
                userId,
                organizationId,
                action: 'security.redaction',
                resourceType: 'user',
                resourceId: String(userId),
                metadata: {
                    before: {
                        _id: String(userId),
                        name: 'Old Name',
                        email: 'private@example.com',
                        password: 'old-password',
                        hashedPassword: 'old-hash',
                        status: 'active',
                        count: 42,
                    },
                    after: {
                        _id: String(userId),
                        title: 'Private title',
                        clientSecret: 'secret-value',
                        profile: 'profile-ref',
                        role: 'user',
                        count: 43,
                    },
                    context: 'security.redaction',
                },
                severity: 'warning',
            });
        });

        const result = await adminIdentity.query(internal.auditLogs.getAuditLogsByResource, {
            resourceType: 'user',
            resourceId: String(userId),
            paginationOpts: { numItems: 10, cursor: null },
        });
        const log = result.page[0];

        expect(log.metadata?.before).toEqual({ _id: String(userId) });
        expect(log.metadata?.after).toEqual({ _id: String(userId), role: 'user' });
        expect(log.metadata?.context).toBe('security.redaction');
    });

    test('recordAuditLog persists actorUserId only when it differs from userId', async () => {
        const subject = await createTestUser(t, {
            userId: 'test-actor-subject-' + Math.random().toString(36).substring(2, 10),
            email: 'actor-subject@example.com-' + Math.random().toString(36).substring(2, 10),
            name: 'Actor Subject',
            password: 'test-password',
            role: 'user',
            emailVerified: true,
        });

        await adminIdentity.run(async ctx => {
            await ctx.runMutation(internal.auditLogs.recordAuditLog, {
                userId: subject.docId,
                actorUserId: userId,
                organizationId,
                action: 'internal.actor',
                resourceType: 'internal',
                resourceId: 'actor-123',
                severity: 'info',
            });
            await ctx.runMutation(internal.auditLogs.recordAuditLog, {
                userId,
                actorUserId: userId,
                organizationId,
                action: 'internal.self',
                resourceType: 'internal',
                resourceId: 'self-123',
                severity: 'info',
            });
        });

        const actorLog = await adminIdentity.query(internal.auditLogs.getAuditLogsByResource, {
            resourceType: 'internal',
            resourceId: 'actor-123',
            paginationOpts: { numItems: 10, cursor: null },
        });
        const selfLog = await adminIdentity.query(internal.auditLogs.getAuditLogsByResource, {
            resourceType: 'internal',
            resourceId: 'self-123',
            paginationOpts: { numItems: 10, cursor: null },
        });

        expect(actorLog.page[0]?.userId).toBe(subject.docId);
        expect(actorLog.page[0]?.actorUserId).toBe(userId);
        expect(selfLog.page[0]?.actorUserId).toBeUndefined();
    });

    test('recorded invitation metadata keeps operational fields without email PII', async () => {
        await adminIdentity.run(async ctx => {
            await ctx.runMutation(internal.auditLogs.recordAuditLog, {
                userId,
                organizationId,
                action: 'invitation.created',
                resourceType: 'invitation',
                resourceId: 'invite-123',
                metadata: {
                    after: {
                        _id: 'invite-123',
                        email: 'invitee@example.com',
                        organizationId: String(organizationId),
                        role: 'member',
                        status: 'pending',
                    },
                },
                severity: 'info',
            });
        });

        const result = await adminIdentity.query(internal.auditLogs.getAuditLogsByResource, {
            resourceType: 'invitation',
            resourceId: 'invite-123',
            paginationOpts: { numItems: 10, cursor: null },
        });

        expect(result.page[0]?.metadata?.after).toEqual({
            _id: 'invite-123',
            organizationId: String(organizationId),
            role: 'member',
            status: 'pending',
        });
    });
});
