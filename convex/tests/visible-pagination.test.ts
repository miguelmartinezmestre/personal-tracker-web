import { describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import type { FunctionReturnType } from 'convex/server';
import type { Id } from '../_generated/dataModel';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestObjective,
    createTestOrganization,
    createTestUser,
} from './test_helpers';
import { identityFor } from './test_identities';

describe('visible objective pagination', () => {
    const t = initConvexTest();
    test('restarts a search when a buffered title changes instead of returning stale matches', async () => {
        const org = await createTestOrganization(t, {
            name: 'Search edit',
            slug: 'search-title-edit',
        });
        const user = await createTestUser(t, {
            userId: 'search-edit',
            name: 'Search user',
            email: 'search-edit@example.test',
        });
        await createTestMember(t, { organizationId: org, userId: user.docId, role: 'owner' });
        const ids: Id<'objectives'>[] = [];
        for (let index = 0; index < 3; index++) {
            ids.push(
                await createTestObjective(t, {
                    organizationId: org,
                    userId: user.docId,
                    title: `Needle edit ${index}`,
                    targetValue: 100,
                })
            );
        }
        const identity = t.withIdentity(identityFor(user));
        const first = await identity.query(api.objectives.searchObjectivesPaginated, {
            search: 'Needle',
            paginationOpts: { cursor: null, numItems: 1 },
        });
        const bufferedId = ids.find(id => !first.page.some(row => row._id === id));
        if (!bufferedId) {
            throw new Error('Missing buffered candidate');
        }
        await identity.mutation(api.objectives.updateObjective, {
            id: bufferedId,
            title: 'Different title',
        });
        await expect(
            identity.query(api.objectives.searchObjectivesPaginated, {
                search: 'Needle',
                paginationOpts: { cursor: first.continueCursor, numItems: 1 },
            })
        ).rejects.toThrow('INVALID_CURSOR');
        const refreshed = await identity.query(api.objectives.searchObjectivesPaginated, {
            search: 'Needle',
            paginationOpts: { cursor: null, numItems: 10 },
        });
        expect(refreshed.page.map(row => row._id).sort()).toEqual(
            ids.filter(id => id !== bufferedId).sort()
        );
    });
    test('consumes more than 500 hidden records and pages past 50 search matches', async () => {
        const organizationId = await createTestOrganization(t, {
            name: 'Paging',
            slug: 'paging-budget',
        });
        const owner = await createTestUser(t, {
            userId: 'page-owner',
            name: 'Owner',
            email: 'page-owner@example.test',
        });
        const reader = await createTestUser(t, {
            userId: 'page-reader',
            name: 'Reader',
            email: 'page-reader@example.test',
        });
        await createTestMember(t, { organizationId, userId: owner.docId, role: 'member' });
        await createTestMember(t, { organizationId, userId: reader.docId, role: 'member' });
        const visibleIds = await t.run(async ctx => {
            const ids: Id<'objectives'>[] = [];
            for (let index = 0; index < 587; index++) {
                const visible = index < 75;
                const id = await ctx.db.insert('objectives', {
                    organizationId,
                    ownerId: owner.docId,
                    createdBy: owner.docId,
                    title: `Needle ${index}`,
                    status: 'active',
                    currentValue: 10,
                    startValue: 10,
                    targetValue: 100,
                    earlyBirdCompleted: false,
                    visibility: visible ? 'organization' : 'private',
                    createdAt: index,
                    updatedAt: index,
                });
                if (visible) {
                    ids.push(id);
                }
            }
            return ids;
        });
        const identity = t.withIdentity(identityFor(reader));
        const first = await identity.query(api.objectives.getObjectives, {
            paginationOpts: { cursor: null, numItems: 25 },
        });
        expect(first.needsContinuation).toBe(true);
        expect(first.isDone).toBe(false);
        expect(first.page).toEqual([]);
        const next = await identity.query(api.objectives.getObjectives, {
            paginationOpts: { cursor: first.continueCursor, numItems: 25 },
        });
        expect(next.page).toHaveLength(25);
        expect(next.needsContinuation).toBe(false);
        expect(next.page.every(row => visibleIds.includes(row._id))).toBe(true);

        let cursor: string | null = null;
        const found: string[] = [];
        let done = false;
        for (let segment = 0; segment < 12 && !done; segment++) {
            const result: FunctionReturnType<typeof api.objectives.searchObjectivesPaginated> =
                await identity.query(api.objectives.searchObjectivesPaginated, {
                    search: 'Needle',
                    paginationOpts: { cursor, numItems: 25 },
                });
            if (!result.needsContinuation) {
                expect(result.page.length).toBeGreaterThan(0);
                found.push(...result.page.map(row => row._id));
            }
            cursor = result.continueCursor;
            done = result.isDone;
        }
        expect(done).toBe(true);
        expect(new Set(found).size).toBe(75);
        expect(found).toHaveLength(75);
        expect(found.sort()).toEqual([...visibleIds].sort());

        await expect(
            identity.query(api.objectives.getObjectives, {
                status: 'completed',
                paginationOpts: { cursor: first.continueCursor, numItems: 25 },
            })
        ).rejects.toThrow('INVALID_CURSOR');
        const ownerIdentity = t.withIdentity(identityFor(owner));
        await expect(
            ownerIdentity.query(api.objectives.getObjectives, {
                paginationOpts: { cursor: first.continueCursor, numItems: 25 },
            })
        ).rejects.toThrow('INVALID_CURSOR');
        await expect(
            identity.query(api.objectives.getObjectives, {
                paginationOpts: { cursor: `${first.continueCursor}corrupt`, numItems: 25 },
            })
        ).rejects.toThrow('INVALID_CURSOR');
    });
});
