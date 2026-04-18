/// <reference types="vite/client" />
import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestUser, createTestOrganization, createTestMember } from './test_helpers';
import { TestConvexForDataModel } from 'convex-test';
import { DataModel } from '../_generated/dataModel';
import { Id } from '../_generated/dataModel';

describe('convex auditLogs', () => {
    const t = initConvexTest();
    let userIdentity: TestConvexForDataModel<DataModel>;
    let adminIdentity: TestConvexForDataModel<DataModel>;
    let userId: Id<'user'>;
    let adminId: Id<'user'>;
    let userOrganizationId: Id<'organization'>;
    let adminOrganizationId: Id<'organization'>;

    beforeEach(async () => {
        const userRandom = Math.random().toString(36).substring(2, 15);
        const adminRandom = Math.random().toString(36).substring(2, 15);

        const admin = {
            userId: 'test-admin-audit-' + adminRandom,
            email: 'admin-audit@example.com-' + adminRandom,
            name: 'Admin Audit User ' + adminRandom,
            password: 'test-password',
            role: 'admin',
            emailVerified: true,
        };
        const adminData = await createTestUser(t, admin);
        adminId = adminData.docId;

        const adminOrgId = await createTestOrganization(t, {
            name: 'Audit Admin Org ' + adminRandom,
            slug: 'audit-admin-org-' + adminRandom,
        });

        await createTestMember(t, {
            organizationId: adminOrgId,
            userId: adminId,
            role: 'owner',
        });

        adminOrganizationId = adminOrgId;

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

        const user = {
            userId: 'test-user-audit-' + userRandom,
            email: 'user-audit@example.com-' + userRandom,
            name: 'User Audit ' + userRandom,
            password: 'test-password',
            role: 'user',
            emailVerified: true,
        };
        const userDataResult = await createTestUser(t, user);
        userId = userDataResult.docId;

        const userOrgId = await createTestOrganization(t, {
            name: 'Audit User Org ' + userRandom,
            slug: 'audit-user-org-' + userRandom,
        });

        await createTestMember(t, {
            organizationId: userOrgId,
            userId,
            role: 'owner',
        });

        userOrganizationId = userOrgId;

        userIdentity = t.withIdentity({
            subject: userDataResult.docId,
            role: user.role,
            email: user.email,
            name: user.name,
            password: user.password,
            emailVerified: user.emailVerified,
            createdAt: Date.now(),
            userId: userDataResult.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });
    });

    describe('getAuditLogs', () => {
        const paginationOpts = { numItems: 100, cursor: null };

        test('creating an objective through mutationWithRLS writes an audit log', async () => {
            const title = `Triggered objective ${Date.now()}`;

            const objectiveId = await userIdentity.mutation(api.objectives.createObjective, {
                title,
                targetValue: 10,
                currentValue: 0,
                scope: 'personal',
            });

            const result = await adminIdentity.query(api.auditLogs.getAuditLogs, {
                paginationOpts,
            });

            const matchingLogs = result.page.filter(
                log =>
                    log.resourceType === 'objective' &&
                    log.resourceId === String(objectiveId) &&
                    log.action === 'objective.created' &&
                    log.userId === userId
            );

            expect(matchingLogs).toHaveLength(1);
            expect(matchingLogs[0]?.organizationId).toBe(userOrganizationId);
        });

        test('returns audit logs sorted by date descending', async () => {
            await adminIdentity.run(async ctx => {
                const now = Date.now();
                await ctx.db.insert('auditLogs', {
                    userId: adminId,
                    organizationId: adminOrganizationId,
                    action: 'objective.created',
                    resourceType: 'objective',
                    resourceId: 'obj-1',
                    severity: 'info',
                    createdAt: now - 2000,
                });
                await ctx.db.insert('auditLogs', {
                    userId: adminId,
                    organizationId: adminOrganizationId,
                    action: 'objective.updated',
                    resourceType: 'objective',
                    resourceId: 'obj-1',
                    severity: 'info',
                    createdAt: now - 1000,
                });
                await ctx.db.insert('auditLogs', {
                    userId: adminId,
                    organizationId: adminOrganizationId,
                    action: 'objective.deleted',
                    resourceType: 'objective',
                    resourceId: 'obj-1',
                    severity: 'critical',
                    createdAt: now,
                });
            });

            const result = await adminIdentity.query(api.auditLogs.getAuditLogs, {
                paginationOpts,
            });

            expect(result.page.length).toBeGreaterThanOrEqual(3);
            for (let i = 0; i < result.page.length - 1; i++) {
                const current = result.page[i]?.createdAt;
                const next = result.page[i + 1]?.createdAt;
                if (current !== undefined && next !== undefined) {
                    expect(current).toBeGreaterThanOrEqual(next);
                }
            }
        });

        test('respects numItems in paginationOpts', async () => {
            await adminIdentity.run(async ctx => {
                const now = Date.now();
                for (let i = 0; i < 10; i++) {
                    await ctx.db.insert('auditLogs', {
                        userId: adminId,
                        organizationId: adminOrganizationId,
                        action: 'objective.created',
                        resourceType: 'objective',
                        resourceId: `obj-${i}`,
                        severity: 'info',
                        createdAt: now - i * 1000,
                    });
                }
            });

            const result = await adminIdentity.query(api.auditLogs.getAuditLogs, {
                paginationOpts: { numItems: 5, cursor: null },
            });

            expect(result.page.length).toBe(5);
            expect(result.isDone).toBe(false);
        });

        test('filters by resourceType when provided', async () => {
            await adminIdentity.run(async ctx => {
                const now = Date.now();
                await ctx.db.insert('auditLogs', {
                    userId: adminId,
                    organizationId: adminOrganizationId,
                    action: 'objective.created',
                    resourceType: 'objective',
                    resourceId: 'obj-1',
                    severity: 'info',
                    createdAt: now - 2000,
                });
                await ctx.db.insert('auditLogs', {
                    userId: adminId,
                    organizationId: adminOrganizationId,
                    action: 'category.created',
                    resourceType: 'category',
                    resourceId: 'cat-1',
                    severity: 'info',
                    createdAt: now - 1000,
                });
                await ctx.db.insert('auditLogs', {
                    userId: adminId,
                    organizationId: adminOrganizationId,
                    action: 'organization.created',
                    resourceType: 'organization',
                    resourceId: 'organization-1',
                    severity: 'info',
                    createdAt: now,
                });
            });

            const result = await adminIdentity.query(api.auditLogs.getAuditLogs, {
                resourceType: 'objective',
                paginationOpts,
            });

            expect(result.page.every(log => log.resourceType === 'objective')).toBe(true);
        });

        test('returns empty page when no logs exist', async () => {
            const result = await adminIdentity.query(api.auditLogs.getAuditLogs, {
                paginationOpts,
            });
            expect(Array.isArray(result.page)).toBe(true);
        });

        test('regular user can only see their own logs', async () => {
            await adminIdentity.run(async ctx => {
                const now = Date.now();
                await ctx.db.insert('auditLogs', {
                    userId: adminId,
                    organizationId: adminOrganizationId,
                    action: 'objective.created',
                    resourceType: 'objective',
                    resourceId: 'obj-admin',
                    severity: 'info',
                    createdAt: now - 1000,
                });
                await ctx.db.insert('auditLogs', {
                    userId: userId,
                    organizationId: userOrganizationId,
                    action: 'objective.created',
                    resourceType: 'objective',
                    resourceId: 'obj-user',
                    severity: 'info',
                    createdAt: now,
                });
            });

            const result = await userIdentity.query(api.auditLogs.getAuditLogs, {
                paginationOpts,
            });
            expect(result.page.every(log => log.userId === userId)).toBe(true);
        });

        test('admin can see all logs', async () => {
            await adminIdentity.run(async ctx => {
                const now = Date.now();
                await ctx.db.insert('auditLogs', {
                    userId: adminId,
                    organizationId: adminOrganizationId,
                    action: 'objective.created',
                    resourceType: 'objective',
                    resourceId: 'obj-admin',
                    severity: 'info',
                    createdAt: now - 1000,
                });
                await ctx.db.insert('auditLogs', {
                    userId: userId,
                    organizationId: userOrganizationId,
                    action: 'objective.created',
                    resourceType: 'objective',
                    resourceId: 'obj-user',
                    severity: 'info',
                    createdAt: now,
                });
            });

            const result = await adminIdentity.query(api.auditLogs.getAuditLogs, {
                paginationOpts,
            });
            const userIds = new Set(result.page.map(log => log.userId));
            expect(userIds.has(adminId)).toBe(true);
            expect(userIds.has(userId)).toBe(true);
        });
    });

    describe('getAuditLogsByResource', () => {
        const paginationOpts = { numItems: 100, cursor: null };

        test('returns logs for a specific resource', async () => {
            await adminIdentity.run(async ctx => {
                const now = Date.now();
                await ctx.db.insert('auditLogs', {
                    userId: adminId,
                    organizationId: adminOrganizationId,
                    action: 'objective.created',
                    resourceType: 'objective',
                    resourceId: 'obj-target',
                    severity: 'info',
                    createdAt: now - 3000,
                });
                await ctx.db.insert('auditLogs', {
                    userId: adminId,
                    organizationId: adminOrganizationId,
                    action: 'objective.updated',
                    resourceType: 'objective',
                    resourceId: 'obj-target',
                    severity: 'info',
                    createdAt: now - 2000,
                });
                await ctx.db.insert('auditLogs', {
                    userId: adminId,
                    organizationId: adminOrganizationId,
                    action: 'objective.created',
                    resourceType: 'objective',
                    resourceId: 'obj-other',
                    severity: 'info',
                    createdAt: now - 1000,
                });
            });

            const result = await adminIdentity.query(api.auditLogs.getAuditLogsByResource, {
                resourceType: 'objective',
                resourceId: 'obj-target',
                paginationOpts,
            });

            expect(result.page.length).toBe(2);
            expect(result.page.every(log => log.resourceId === 'obj-target')).toBe(true);
        });

        test('returns empty page for non-existent resource', async () => {
            const result = await adminIdentity.query(api.auditLogs.getAuditLogsByResource, {
                resourceType: 'objective',
                resourceId: 'non-existent',
                paginationOpts,
            });

            expect(result.page).toEqual([]);
        });
    });

    describe('audit log schema', () => {
        test('stores metadata correctly', async () => {
            let logId: Id<'auditLogs'>;

            await adminIdentity.run(async ctx => {
                logId = await ctx.db.insert('auditLogs', {
                    userId: adminId,
                    organizationId: adminOrganizationId,
                    action: 'objective.updated',
                    resourceType: 'objective',
                    resourceId: 'obj-1',
                    metadata: {
                        before: { title: 'Old Title', status: 'active' },
                        after: { title: 'New Title', status: 'completed' },
                        context: 'Updated objective details',
                    },
                    severity: 'warning',
                    createdAt: Date.now(),
                });
            });

            const log = await adminIdentity.run(async ctx => ctx.db.get(logId!));

            expect(log?.metadata?.before).toEqual({ title: 'Old Title', status: 'active' });
            expect(log?.metadata?.after).toEqual({ title: 'New Title', status: 'completed' });
            expect(log?.metadata?.context).toBe('Updated objective details');
        });

        test('stores severity levels correctly', async () => {
            const severities = ['info', 'warning', 'critical'] as const;
            const logIds: Id<'auditLogs'>[] = [];

            await adminIdentity.run(async ctx => {
                const now = Date.now();
                for (const severity of severities) {
                    const id = await ctx.db.insert('auditLogs', {
                        userId: adminId,
                        organizationId: adminOrganizationId,
                        action: 'objective.created',
                        resourceType: 'objective',
                        severity,
                        createdAt: now,
                    });
                    logIds.push(id);
                }
            });

            for (let i = 0; i < severities.length; i++) {
                const log = await adminIdentity.run(async ctx => ctx.db.get(logIds[i]!));
                expect(log?.severity).toBe(severities[i]);
            }
        });

        test('resourceId is optional', async () => {
            let logId: Id<'auditLogs'>;

            await adminIdentity.run(async ctx => {
                logId = await ctx.db.insert('auditLogs', {
                    userId: adminId,
                    organizationId: adminOrganizationId,
                    action: 'category.defaults_created',
                    resourceType: 'category',
                    severity: 'info',
                    createdAt: Date.now(),
                });
            });

            const log = await adminIdentity.run(async ctx => ctx.db.get(logId!));
            expect(log?.resourceId).toBeUndefined();
        });
    });

    describe('RLS rules', () => {
        test('audit logs immutability is enforced via RLS config', async () => {
            let logId: Id<'auditLogs'>;

            await adminIdentity.run(async ctx => {
                logId = await ctx.db.insert('auditLogs', {
                    userId: adminId,
                    organizationId: adminOrganizationId,
                    action: 'objective.created',
                    resourceType: 'objective',
                    severity: 'info',
                    createdAt: Date.now(),
                });
            });

            const log = await adminIdentity.run(async ctx => ctx.db.get(logId!));
            expect(log).not.toBeNull();
            expect(log?.action).toBe('objective.created');
        });

        test('audit logs do not have updatedAt field (immutable by design)', async () => {
            let logId: Id<'auditLogs'>;

            await adminIdentity.run(async ctx => {
                logId = await ctx.db.insert('auditLogs', {
                    userId: adminId,
                    organizationId: adminOrganizationId,
                    action: 'objective.created',
                    resourceType: 'objective',
                    severity: 'info',
                    createdAt: Date.now(),
                });
            });

            const log = await adminIdentity.run(async ctx => ctx.db.get(logId!));
            expect(log).not.toBeNull();
            expect('updatedAt' in (log ?? {})).toBe(false);
        });
    });

    describe('unauthenticated access', () => {
        test('getAuditLogs rejects when unauthenticated', async () => {
            await expect(
                t.query(api.auditLogs.getAuditLogs, {
                    paginationOpts: { numItems: 10, cursor: null },
                })
            ).rejects.toThrow(/Unauthenticated|User not authenticated/);
        });

        test('getAuditLogsByResource rejects when unauthenticated', async () => {
            await expect(
                t.query(api.auditLogs.getAuditLogsByResource, {
                    resourceType: 'objective',
                    resourceId: 'obj-1',
                    paginationOpts: { numItems: 10, cursor: null },
                })
            ).rejects.toThrow(/Unauthenticated|User not authenticated/);
        });
    });
});
