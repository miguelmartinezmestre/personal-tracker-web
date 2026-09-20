import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestMember, createTestOrganization, createTestUser } from './test_helpers';
import type { DataModel, Id } from '../_generated/dataModel';
import type { TestConvexForDataModel } from 'convex-test';

describe('convex auditLogs', () => {
    const t = initConvexTest();
    let userIdentity: TestConvexForDataModel<DataModel>;
    let adminIdentity: TestConvexForDataModel<DataModel>;
    let userId: Id<'user'>;
    let adminId: Id<'user'>;
    let userOrganizationId: Id<'organization'>;
    let adminOrganizationId: Id<'organization'>;
    const paginationOpts = { numItems: 100, cursor: null };

    beforeEach(async () => {
        const adminRandom = Math.random().toString(36).substring(2, 15);
        const admin = await createTestUser(t, {
            userId: 'test-admin-audit-' + adminRandom,
            email: 'admin-audit@example.com-' + adminRandom,
            name: 'Admin Audit User ' + adminRandom,
            password: 'test-password',
            role: 'globalAdmin',
            emailVerified: true,
        });
        adminId = admin.docId;
        adminOrganizationId = await createTestOrganization(t, {
            name: 'Audit Admin Org ' + adminRandom,
            slug: 'audit-admin-org-' + adminRandom,
        });
        await createTestMember(t, {
            organizationId: adminOrganizationId,
            userId: adminId,
            role: 'owner',
        });
        adminIdentity = t.withIdentity({
            subject: admin.docId,
            role: admin.role ?? 'globalAdmin',
            email: admin.email,
            name: admin.name,
            password: 'test-password',
            emailVerified: true,
            createdAt: Date.now(),
            userId: admin.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });

        const userRandom = Math.random().toString(36).substring(2, 15);
        const user = await createTestUser(t, {
            userId: 'test-user-audit-' + userRandom,
            email: 'user-audit@example.com-' + userRandom,
            name: 'User Audit ' + userRandom,
            password: 'test-password',
            role: 'user',
            emailVerified: true,
        });
        userId = user.docId;
        userOrganizationId = await createTestOrganization(t, {
            name: 'Audit User Org ' + userRandom,
            slug: 'audit-user-org-' + userRandom,
        });
        await createTestMember(t, {
            organizationId: userOrganizationId,
            userId,
            role: 'owner',
        });
        userIdentity = t.withIdentity({
            subject: user.docId,
            role: user.role ?? 'user',
            email: user.email,
            name: user.name,
            password: 'test-password',
            emailVerified: true,
            createdAt: Date.now(),
            userId: user.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });
    });

    test('creating an objective through mutationWithRLS writes a sanitized audit log', async () => {
        const objectiveId = await userIdentity.mutation(api.objectives.createObjective, {
            title: `Triggered objective ${Date.now()}`,
            targetValue: 10,
            currentValue: 0,
        });

        const result = await adminIdentity.query(api.auditLogs.getAuditLogs, { paginationOpts });
        const log = result.page.find(
            entry =>
                entry.resourceType === 'objective' &&
                entry.resourceId === String(objectiveId) &&
                entry.action === 'objective.created'
        );

        expect(log).toMatchObject({
            userId,
            organizationId: userOrganizationId,
        });
        expect(log?.actorUserId).toBeUndefined();
        expect(log?.metadata?.after).toHaveProperty('_id', String(objectiveId));
        expect(log?.metadata?.after).toHaveProperty('status');
        expect(log?.metadata?.after).not.toHaveProperty('title');
        expect(log?.metadata?.after).not.toHaveProperty('category');
        expect(log?.metadata?.after).not.toHaveProperty('unit');
    });

    test('getAuditLogs paginates, sorts, filters, and enforces admin visibility', async () => {
        await adminIdentity.run(async ctx => {
            const now = Date.now();
            for (let i = 0; i < 10; i++) {
                await ctx.db.insert('auditLogs', {
                    userId: adminId,
                    organizationId: adminOrganizationId,
                    action: i % 2 === 0 ? 'objective.created' : 'category.created',
                    resourceType: i % 2 === 0 ? 'objective' : 'category',
                    resourceId: `admin-${i}`,
                    createdAt: now - i * 1000,
                });
            }
            await ctx.db.insert('auditLogs', {
                userId,
                organizationId: userOrganizationId,
                action: 'objective.created',
                resourceType: 'objective',
                resourceId: 'user-objective',
                createdAt: now + 1000,
            });
        });

        const firstPage = await adminIdentity.query(api.auditLogs.getAuditLogs, {
            paginationOpts: { numItems: 5, cursor: null },
        });
        const objectiveLogs = await adminIdentity.query(api.auditLogs.getAuditLogs, {
            resourceType: 'objective',
            paginationOpts,
        });
        const userLogs = await userIdentity.query(api.auditLogs.getAuditLogs, { paginationOpts });

        expect(firstPage.page).toHaveLength(5);
        expect(firstPage.isDone).toBe(false);
        expect(firstPage.page[0].createdAt).toBeGreaterThanOrEqual(firstPage.page[1].createdAt);
        expect(objectiveLogs.page.every(log => log.resourceType === 'objective')).toBe(true);
        const visibleUserIds = new Set(objectiveLogs.page.map(log => log.userId));
        expect(visibleUserIds.has(adminId)).toBe(true);
        expect(visibleUserIds.has(userId)).toBe(true);
        expect(userLogs.page.every(log => log.userId === userId)).toBe(true);
    });

    test('audit log schema supports metadata plus optional resource and actor fields', async () => {
        const logIds = await adminIdentity.run(async ctx => {
            const now = Date.now();
            return await Promise.all([
                ctx.db.insert('auditLogs', {
                    userId,
                    actorUserId: adminId,
                    organizationId: adminOrganizationId,
                    action: 'user.updated',
                    resourceType: 'user',
                    resourceId: String(userId),
                    metadata: {
                        before: { status: 'active', currentValue: 1 },
                        after: { status: 'completed', currentValue: 10 },
                        context: 'objective.updated',
                    },
                    createdAt: now,
                }),
                ctx.db.insert('auditLogs', {
                    userId: adminId,
                    organizationId: adminOrganizationId,
                    action: 'category.defaults_created',
                    resourceType: 'category',
                    createdAt: now,
                }),
            ]);
        });

        const [withMetadata, withoutResource] = await adminIdentity.run(async ctx => {
            return Promise.all([
                ctx.db.get('auditLogs', logIds[0]),
                ctx.db.get('auditLogs', logIds[1]),
            ]);
        });

        expect(withMetadata).toMatchObject({
            userId,
            actorUserId: adminId,
            resourceId: String(userId),
            metadata: {
                before: { status: 'active', currentValue: 1 },
                after: { status: 'completed', currentValue: 10 },
                context: 'objective.updated',
            },
        });
        expect(withoutResource?.resourceId).toBeUndefined();
    });

    test('audit logs are immutable records without updatedAt', async () => {
        const logId = await adminIdentity.run(async ctx => {
            return await ctx.db.insert('auditLogs', {
                userId: adminId,
                organizationId: adminOrganizationId,
                action: 'objective.created',
                resourceType: 'objective',
                createdAt: Date.now(),
            });
        });

        const log = await adminIdentity.run(async ctx => ctx.db.get('auditLogs', logId));
        expect(log).not.toBeNull();
        expect(log?.action).toBe('objective.created');
        expect('updatedAt' in (log ?? {})).toBe(false);
    });

    test('audit log queries reject unauthenticated callers', async () => {
        await expect(
            t.query(api.auditLogs.getAuditLogs, {
                paginationOpts: { numItems: 10, cursor: null },
            })
        ).rejects.toThrow(/Unauthenticated|User not authenticated|AUTH_REQUIRED/);
    });
});
