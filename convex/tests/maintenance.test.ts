import { describe, expect, test } from 'vitest';
import { internal } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestOrganization, createTestUser } from './test_helpers';

describe('orphan diagnosis and repair', () => {
    const t = initConvexTest();
    test('reports by default and repairs only the explicit organization idempotently', async () => {
        const organizationId = await createTestOrganization(t, {
            name: 'Orphan target',
            slug: 'orphan-target',
        });
        const otherOrganizationId = await createTestOrganization(t, {
            name: 'Other target',
            slug: 'other-target',
        });
        const creator = await createTestUser(t, {
            userId: 'orphan-creator',
            email: 'orphan@example.test',
            name: 'Deleted creator',
        });
        const [categoryId, otherId] = await t.run(async ctx => {
            const category = {
                name: 'Orphan creator category',
                color: '#123456',
                icon: 'Target',
                userId: creator.docId,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            const first = await ctx.db.insert('categories', { ...category, organizationId });
            const second = await ctx.db.insert('categories', {
                ...category,
                organizationId: otherOrganizationId,
            });
            await ctx.db.delete('user', creator.docId);
            return [first, second] as const;
        });
        const report = await t.mutation(internal.maintenance.inspectOrphans, {
            table: 'categories',
            organizationId,
        });
        expect(report.findings).toEqual([
            { id: categoryId, reason: 'creator_missing', action: 'clear_creator', repaired: false },
        ]);
        expect(await t.run(async ctx => (await ctx.db.get('categories', categoryId))?.userId)).toBe(
            creator.docId
        );
        await expect(
            t.mutation(internal.maintenance.inspectOrphans, { table: 'categories', repair: true })
        ).rejects.toThrow('explicit organizationId');
        const repaired = await t.mutation(internal.maintenance.inspectOrphans, {
            table: 'categories',
            organizationId,
            repair: true,
        });
        expect(repaired.findings).toEqual([
            { id: categoryId, reason: 'creator_missing', action: 'clear_creator', repaired: true },
        ]);
        const repairedCategory = await t.run(
            async ctx => await ctx.db.get('categories', categoryId)
        );
        expect(repairedCategory).not.toBeNull();
        expect(repairedCategory).not.toHaveProperty('userId');
        expect(await t.run(async ctx => (await ctx.db.get('categories', otherId))?.userId)).toBe(
            creator.docId
        );
        expect(
            (
                await t.mutation(internal.maintenance.inspectOrphans, {
                    table: 'categories',
                    organizationId,
                    repair: true,
                })
            ).findings
        ).toEqual([]);
    });
});
