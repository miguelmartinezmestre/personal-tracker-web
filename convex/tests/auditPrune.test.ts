import { describe, expect, test, vi } from 'vitest';
import { internal } from '../_generated/api';
import type { MutationCtx } from '../_generated/server';
import { asInvalidArg } from './testCasts';
import { pruneAuditLogsOlderThanRetentionJob } from '../jobs/audit/pruneAuditLogs';
import { initConvexTest } from './test.helper';
import { createTestOrganization, createTestUser } from './test_helpers';

describe('audit log retention pruning', () => {
    test('deletes only audit logs older than the retention window', async () => {
        const t = initConvexTest();
        const user = await createTestUser(t, {
            userId: 'audit-prune-user',
            email: 'audit-prune@example.com',
            name: 'Audit Prune User',
        });
        const organizationId = await createTestOrganization(t, {
            name: 'Audit Prune Org',
            slug: 'audit-prune-org',
        });
        const now = Date.now();
        const oldCreatedAt = now - 91 * 24 * 60 * 60 * 1000;
        const retainedCreatedAt = now - 10 * 24 * 60 * 60 * 1000;

        const ids = await t.run(async ctx => {
            const oldId = await ctx.db.insert('auditLogs', {
                userId: user.docId,
                organizationId,
                action: 'OLD_ACTION',
                resourceType: 'test',
                severity: 'low',
                createdAt: oldCreatedAt,
            });
            const retainedId = await ctx.db.insert('auditLogs', {
                userId: user.docId,
                organizationId,
                action: 'RETAINED_ACTION',
                resourceType: 'test',
                severity: 'low',
                createdAt: retainedCreatedAt,
            });
            return { oldId, retainedId };
        });

        await t.mutation(internal.auditLogs.pruneAuditLogsOlderThanRetention, {});

        const remaining = await t.run(async ctx => ({
            old: await ctx.db.get('auditLogs', ids.oldId),
            retained: await ctx.db.get('auditLogs', ids.retainedId),
        }));

        expect(remaining.old).toBeNull();
        expect(remaining.retained?.action).toBe('RETAINED_ACTION');
    });

    test('schedules continuation after pruning a full batch', async () => {
        const batch = Array.from({ length: 256 }, (_, index) => ({ _id: `audit-${index}` }));
        const take = vi.fn().mockResolvedValue(batch);
        const withIndex = vi.fn(() => ({ take }));
        const query = vi.fn(() => ({ withIndex }));
        const deleteAuditLog = vi.fn();
        const runAfter = vi.fn();
        const ctx = asInvalidArg<MutationCtx>({
            db: {
                query,
                delete: deleteAuditLog,
            },
            scheduler: {
                runAfter,
            },
        });

        await pruneAuditLogsOlderThanRetentionJob(ctx);

        expect(query).toHaveBeenCalledWith('auditLogs');
        expect(deleteAuditLog).toHaveBeenCalledTimes(256);
        expect(runAfter).toHaveBeenCalledWith(0, expect.anything(), {});
    });
});
