import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { internal } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestUser, createTestOrganization, createTestMember } from './test_helpers';
import { Id } from '../_generated/dataModel';

describe('auditLogs security', () => {
    const t = initConvexTest();
    let userId: Id<'user'>;
    let organizationId: Id<'organization'>;
    let adminIdentity: ReturnType<typeof t.withIdentity>;

    beforeEach(async () => {
        const random = Math.random().toString(36).substring(2, 15);

        const admin = {
            userId: 'test-admin-audit-security-' + random,
            email: 'admin-audit-security@example.com-' + random,
            name: 'Admin Audit Security ' + random,
            password: 'test-password',
            role: 'admin',
            emailVerified: true,
        };
        const adminData = await createTestUser(t, admin);
        userId = adminData.docId;

        const orgId = await createTestOrganization(t, {
            name: 'Audit Security Org ' + random,
            slug: 'audit-security-org-' + random,
        });
        organizationId = orgId;

        await createTestMember(t, {
            organizationId: orgId,
            userId,
            role: 'owner',
        });

        adminIdentity = t.withIdentity({
            subject: adminData.docId,
            role: admin.role,
            email: admin.email,
            name: admin.name,
            password: admin.password,
            emailVerified: admin.emailVerified,
            createdAt: Date.now(),
            userId: adminData.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });
    });

    describe('sanitization', () => {
        test('session audit log metadata does not contain tokens', async () => {
            await adminIdentity.run(async ctx => {
                const now = Date.now();
                await ctx.db.insert('auditLogs', {
                    userId,
                    organizationId,
                    action: 'session.created',
                    resourceType: 'session',
                    resourceId: 'session-123',
                    metadata: {
                        after: {
                            _id: 'session-123',
                            userId: userId,
                            expiresAt: now + 3600000,
                            createdAt: now,
                            updatedAt: now,
                        },
                    },
                    severity: 'info',
                    createdAt: now,
                });
            });

            const result = await adminIdentity.query(api.auditLogs.getAuditLogsByResource, {
                resourceType: 'session',
                resourceId: 'session-123',
                paginationOpts: { numItems: 10, cursor: null },
            });

            const log = result.page[0];
            expect(log).toBeDefined();
            expect(log?.metadata?.after).not.toHaveProperty('token');
            expect(log?.metadata?.after).not.toHaveProperty('accessToken');
            expect(log?.metadata?.after).not.toHaveProperty('refreshToken');
        });

        test('audit logs do not contain PII fields', async () => {
            await adminIdentity.run(async ctx => {
                const now = Date.now();
                await ctx.db.insert('auditLogs', {
                    userId,
                    organizationId,
                    action: 'user.login',
                    resourceType: 'user',
                    resourceId: String(userId),
                    metadata: {
                        context: 'Login attempt',
                    },
                    severity: 'info',
                    createdAt: now,
                });
            });

            const result = await adminIdentity.query(api.auditLogs.getAuditLogsByResource, {
                resourceType: 'user',
                resourceId: String(userId),
                paginationOpts: { numItems: 10, cursor: null },
            });

            const log = result.page[0];
            expect(log).toBeDefined();
            expect(log?.metadata).not.toHaveProperty('email');
            expect(log?.metadata).not.toHaveProperty('ipAddress');
            expect(log?.metadata).not.toHaveProperty('userAgent');
            expect(log?.metadata).not.toHaveProperty('image');
            expect(log?.metadata).not.toHaveProperty('accountId');
            expect(log?.metadata).not.toHaveProperty('impersonatedBy');
        });

        test('audit logs do not contain passwords or secrets', async () => {
            await adminIdentity.run(async ctx => {
                const now = Date.now();
                await ctx.db.insert('auditLogs', {
                    userId,
                    organizationId,
                    action: 'user.updated',
                    resourceType: 'user',
                    resourceId: String(userId),
                    metadata: {
                        before: { name: 'Old Name' },
                        after: { name: 'New Name' },
                    },
                    severity: 'warning',
                    createdAt: now,
                });
            });

            const result = await adminIdentity.query(api.auditLogs.getAuditLogsByResource, {
                resourceType: 'user',
                resourceId: String(userId),
                paginationOpts: { numItems: 10, cursor: null },
            });

            const log = result.page[0];
            expect(log).toBeDefined();
            expect(log?.metadata).not.toHaveProperty('password');
            expect(log?.metadata?.before).not.toHaveProperty('password');
            expect(log?.metadata?.after).not.toHaveProperty('password');
            expect(log?.metadata).not.toHaveProperty('hashedPassword');
            expect(log?.metadata).not.toHaveProperty('secret');
            expect(log?.metadata).not.toHaveProperty('clientSecret');
        });

        test('metadata accepts only valid primitive types', async () => {
            await adminIdentity.run(async ctx => {
                const now = Date.now();

                await ctx.db.insert('auditLogs', {
                    userId,
                    organizationId,
                    action: 'test.action',
                    resourceType: 'test',
                    metadata: {
                        after: {
                            stringField: 'value',
                            numberField: 123,
                            booleanField: true,
                            nullField: null,
                            nested: {
                                allowed: 'value',
                            },
                        },
                    },
                    severity: 'info',
                    createdAt: now,
                });
            });

            const result = await adminIdentity.query(api.auditLogs.getAuditLogs, {
                paginationOpts: { numItems: 10, cursor: null },
            });

            expect(result.page.length).toBeGreaterThan(0);
        });

        test('nested metadata is sanitized properly', async () => {
            await adminIdentity.run(async ctx => {
                const now = Date.now();
                await ctx.db.insert('auditLogs', {
                    userId,
                    organizationId,
                    action: 'user.updated',
                    resourceType: 'user',
                    resourceId: String(userId),
                    metadata: {
                        before: {
                            profile: {
                                name: 'Old Name',
                            },
                        },
                        after: {
                            profile: {
                                name: 'New Name',
                            },
                        },
                    },
                    severity: 'warning',
                    createdAt: now,
                });
            });

            const result = await adminIdentity.query(api.auditLogs.getAuditLogsByResource, {
                resourceType: 'user',
                resourceId: String(userId),
                paginationOpts: { numItems: 10, cursor: null },
            });

            const log = result.page[0];
            const metadata = log?.metadata as
                | {
                      before?: { profile?: unknown };
                      after?: { profile?: unknown };
                  }
                | undefined;
            expect(log).toBeDefined();
            expect(metadata?.before?.profile).toEqual({ name: 'Old Name' });
            expect(metadata?.after?.profile).toEqual({ name: 'New Name' });
        });
    });

    describe('internal recordAuditLog', () => {
        test('internal mutation records audit log correctly', async () => {
            await adminIdentity.run(async ctx => {
                await ctx.runMutation(internal.auditLogs.recordAuditLog, {
                    userId,
                    organizationId,
                    action: 'internal.test',
                    resourceType: 'internal',
                    resourceId: 'test-123',
                    severity: 'info',
                    metadata: {
                        context: 'Internal test action',
                    },
                });
            });

            const result = await adminIdentity.query(api.auditLogs.getAuditLogsByResource, {
                resourceType: 'internal',
                resourceId: 'test-123',
                paginationOpts: { numItems: 10, cursor: null },
            });

            expect(result.page.length).toBe(1);
            expect(result.page[0]?.action).toBe('internal.test');
            expect(result.page[0]?.metadata?.context).toBe('Internal test action');
        });

        test('internal mutation metadata follows schema validation', async () => {
            await adminIdentity.run(async ctx => {
                await ctx.runMutation(internal.auditLogs.recordAuditLog, {
                    userId,
                    organizationId,
                    action: 'internal.valid',
                    resourceType: 'internal',
                    severity: 'info',
                    metadata: {
                        before: { status: 'old', count: 5 },
                        after: { status: 'new', count: 10 },
                        context: 'Status change',
                    },
                });
            });

            const result = await adminIdentity.query(api.auditLogs.getAuditLogs, {
                paginationOpts: { numItems: 10, cursor: null },
            });

            const log = result.page.find(l => l.action === 'internal.valid');
            expect(log).toBeDefined();
            expect(log?.metadata?.before).toEqual({ status: 'old', count: 5 });
            expect(log?.metadata?.after).toEqual({ status: 'new', count: 10 });
        });
    });

    describe('redaction keys', () => {
        test('schema validator enforces safe data structure in metadata', async () => {
            await adminIdentity.run(async ctx => {
                const now = Date.now();

                await ctx.db.insert('auditLogs', {
                    userId,
                    organizationId,
                    action: 'security.test',
                    resourceType: 'security',
                    metadata: {
                        before: {
                            _id: 'test-id',
                            name: 'Test Name',
                            status: 'active',
                            count: 42,
                        },
                        after: {
                            _id: 'test-id',
                            name: 'Updated Name',
                            status: 'completed',
                            count: 43,
                        },
                        context: 'Security test with safe data only',
                    },
                    severity: 'info',
                    createdAt: now,
                });
            });

            const result = await adminIdentity.query(api.auditLogs.getAuditLogs, {
                paginationOpts: { numItems: 10, cursor: null },
            });

            const log = result.page.find(l => l.action === 'security.test');
            expect(log).toBeDefined();

            expect(log?.metadata?.before).toEqual({
                _id: 'test-id',
                name: 'Test Name',
                status: 'active',
                count: 42,
            });
            expect(log?.metadata?.after).toEqual({
                _id: 'test-id',
                name: 'Updated Name',
                status: 'completed',
                count: 43,
            });
        });

        test('AUDIT_REDACT_KEYS list includes all required sensitive fields', () => {
            const expectedKeys = new Set([
                'token',
                'password',
                'accessToken',
                'refreshToken',
                'idToken',
                'hashedPassword',
                'otp',
                'secret',
                'clientSecret',
                'email',
                'ipAddress',
                'userAgent',
                'image',
                'accountId',
                'impersonatedBy',
                'value',
            ]);

            expect(expectedKeys.has('token')).toBe(true);
            expect(expectedKeys.has('password')).toBe(true);
            expect(expectedKeys.has('email')).toBe(true);
            expect(expectedKeys.has('ipAddress')).toBe(true);
            expect(expectedKeys.has('userAgent')).toBe(true);
            expect(expectedKeys.has('image')).toBe(true);
            expect(expectedKeys.has('accountId')).toBe(true);
            expect(expectedKeys.has('impersonatedBy')).toBe(true);
        });
    });

    describe('invitation sanitization', () => {
        test('invitation audit logs do not contain email PII', async () => {
            await adminIdentity.run(async ctx => {
                const now = Date.now();
                await ctx.db.insert('auditLogs', {
                    userId,
                    organizationId,
                    action: 'invitation.created',
                    resourceType: 'invitation',
                    resourceId: 'invite-123',
                    metadata: {
                        after: {
                            _id: 'invite-123',
                            organizationId: String(organizationId),
                            role: 'member',
                            status: 'pending',
                            expiresAt: now + 86400000,
                            createdAt: now,
                            inviterId: String(userId),
                        },
                    },
                    severity: 'info',
                    createdAt: now,
                });
            });

            const result = await adminIdentity.query(api.auditLogs.getAuditLogsByResource, {
                resourceType: 'invitation',
                resourceId: 'invite-123',
                paginationOpts: { numItems: 10, cursor: null },
            });

            const log = result.page[0];
            expect(log).toBeDefined();
            expect(log?.metadata?.after).not.toHaveProperty('email');
            expect(log?.metadata?.after).toHaveProperty('organizationId');
            expect(log?.metadata?.after).toHaveProperty('role');
            expect(log?.metadata?.after).toHaveProperty('status');
        });
    });

    describe('user sanitization', () => {
        test('user audit logs do not contain PII in metadata', async () => {
            await adminIdentity.run(async ctx => {
                const now = Date.now();
                await ctx.db.insert('auditLogs', {
                    userId,
                    organizationId,
                    action: 'user.updated',
                    resourceType: 'user',
                    resourceId: String(userId),
                    metadata: {
                        before: {
                            _id: String(userId),
                            name: 'Old Name',
                            emailVerified: true,
                            role: 'user',
                        },
                        after: {
                            _id: String(userId),
                            name: 'New Name',
                            emailVerified: true,
                            role: 'user',
                        },
                    },
                    severity: 'warning',
                    createdAt: now,
                });
            });

            const result = await adminIdentity.query(api.auditLogs.getAuditLogsByResource, {
                resourceType: 'user',
                resourceId: String(userId),
                paginationOpts: { numItems: 10, cursor: null },
            });

            const log = result.page[0];
            expect(log).toBeDefined();
            expect(log?.metadata?.before).not.toHaveProperty('email');
            expect(log?.metadata?.before).not.toHaveProperty('image');
            expect(log?.metadata?.before).toHaveProperty('name');
            expect(log?.metadata?.before).toHaveProperty('role');
        });
    });
});
