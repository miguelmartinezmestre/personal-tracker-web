import { beforeEach, describe, expect, test } from 'vitest';
import { api, internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { GLOBAL_ADMIN_ROLE } from '../features/auth/roles';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestOrganization,
    createTestUser,
    type TestUserData,
} from './test.helpers';
import { identityFor } from './test.identities';

const page = { numItems: 20, cursor: null };

describe('objective permissions', () => {
    const t = initConvexTest();
    let organizationId: Id<'organization'>;
    let owner: TestUserData;
    let admin: TestUserData;
    let creator: TestUserData;
    let member: TestUserData;
    let teammate: TestUserData;

    const as = (user: TestUserData) => t.withIdentity(identityFor(user));

    async function joinAs(role: string, name: string, userRole = 'user') {
        const suffix = Math.random().toString(36).slice(2, 10);

        const user = await createTestUser(t, {
            userId: `${name}-${suffix}`,
            email: `${name}-${suffix}@example.com`,
            name,
            role: userRole,
        });

        await createTestMember(t, { organizationId, userId: user.docId, role });

        return user;
    }

    beforeEach(async () => {
        const suffix = Math.random().toString(36).slice(2, 10);
        organizationId = await createTestOrganization(t, {
            name: `Access ${suffix}`,
            slug: `access-${suffix}`,
        });
        owner = await joinAs('owner', 'owner');
        admin = await joinAs('admin', 'admin');
        creator = await joinAs('member', 'creator');
        member = await joinAs('member', 'member');
        teammate = await joinAs('member', 'teammate');
    });

    const createObjective = (
        access: {
            memberAccess?: 'none' | 'view' | 'edit';
            users?: { userId: Id<'user'>; access: 'view' | 'edit' }[];
        } = {}
    ) =>
        as(creator).mutation(api.objectives.createObjective, {
            title: 'Shared work',
            startValue: 0,
            targetValue: 10,
            ...access,
        });

    const listIds = async (user: TestUserData) =>
        (await as(user).query(api.objectives.listObjectives, { paginationOpts: page })).page.map(
            objective => objective.id
        );

    const logProgress = (user: TestUserData, objectiveId: Id<'objectives'>) =>
        as(user).mutation(api.progress.createProgress, {
            objectiveId,
            updatedValue: 1,
            updateDate: Date.UTC(2026, 0, 2),
        });

    test('members create objectives that every member can see but not edit by default @REQ-COLABORACION-001 @REQ-COLABORACION-003 @INH-OBJ-05 @INH-OBJ-06', async () => {
        const objectiveId = await createObjective();

        expect(
            await as(creator).query(api.objectives.getObjective, { id: objectiveId })
        ).toMatchObject({ memberAccess: 'view', canEdit: true, canManage: true });
        expect(
            await as(member).query(api.objectives.getObjective, { id: objectiveId })
        ).toMatchObject({ memberAccess: 'view', canEdit: false, canManage: false });
        expect(await listIds(member)).toEqual([objectiveId]);
        await t.run(async ctx => {
            expect(await ctx.db.get('objectives', objectiveId)).toMatchObject({
                createdBy: creator.docId,
            });
        });
    });

    test('view without edit cannot log progress, edit the objective or delete it @REQ-COLABORACION-005 @REQ-COLABORACION-002', async () => {
        const objectiveId = await createObjective();
        const before = await as(owner).query(api.objectives.getObjective, { id: objectiveId });

        await expect(logProgress(member, objectiveId)).rejects.toThrow('NOT_AUTHORIZED_PROGRESS');
        await expect(
            as(member).mutation(api.objectives.updateObjective, { id: objectiveId, title: 'No' })
        ).rejects.toThrow('NOT_AUTHORIZED_OBJECTIVE');
        await expect(
            as(member).mutation(api.objectives.deleteObjective, { id: objectiveId })
        ).rejects.toThrow('NOT_AUTHORIZED_OBJECTIVE');

        expect(await as(owner).query(api.objectives.getObjective, { id: objectiveId })).toEqual(
            before
        );
    });

    test("the member role with edit can log and correct anyone's progress but not manage access @REQ-COLABORACION-005 @INH-PER-07", async () => {
        const objectiveId = await createObjective({ memberAccess: 'edit' });
        const ownersEntry = await logProgress(owner, objectiveId);

        await logProgress(member, objectiveId);
        await as(member).mutation(api.progress.updateProgress, {
            id: ownersEntry.id,
            updatedValue: 3,
            updateDate: Date.UTC(2026, 0, 2),
        });

        expect(
            await as(member).query(api.objectives.getObjective, { id: objectiveId })
        ).toMatchObject({ currentValue: 4, canEdit: true, canManage: false });
        await expect(
            as(member).mutation(api.objectiveAccess.updateObjectiveAccess, {
                objectiveId,
                memberAccess: 'none',
                users: [],
            })
        ).rejects.toThrow('NOT_AUTHORIZED_OBJECTIVE');
        await expect(
            as(member).query(api.objectiveAccess.getObjectiveAccess, { objectiveId })
        ).rejects.toThrow('NOT_AUTHORIZED_OBJECTIVE');
    });

    test('a private objective is seen only by its creator, the owner, the admins and individual grants @REQ-COLABORACION-004 @INH-PER-03 @REQ-NF-003', async () => {
        const objectiveId = await createObjective({
            memberAccess: 'none',
            users: [{ userId: teammate.docId, access: 'view' }],
        });

        for (const user of [creator, owner, admin, teammate]) {
            expect(await listIds(user)).toEqual([objectiveId]);
        }

        expect(await listIds(member)).toEqual([]);
        expect(await as(member).query(api.objectives.getObjective, { id: objectiveId })).toBeNull();
        await expect(
            as(member).query(api.progress.getProgressHistory, { objectiveId })
        ).rejects.toThrow('OBJECTIVE_NOT_FOUND');
        await expect(logProgress(member, objectiveId)).rejects.toThrow('OBJECTIVE_NOT_FOUND');

        await logProgress(admin, objectiveId);
        expect(
            await as(owner).query(api.objectives.getObjective, { id: objectiveId })
        ).toMatchObject({ currentValue: 1, canEdit: true, canManage: true });
        await expect(logProgress(teammate, objectiveId)).rejects.toThrow('NOT_AUTHORIZED_PROGRESS');
    });

    test('granting edit lets a user edit, and taking view away takes edit with it @REQ-COLABORACION-005 @INH-PER-01 @INH-PER-07', async () => {
        const objectiveId = await createObjective({ memberAccess: 'none' });

        await as(creator).mutation(api.objectiveAccess.updateObjectiveAccess, {
            objectiveId,
            memberAccess: 'none',
            users: [{ userId: member.docId, access: 'edit' }],
        });
        expect(
            await as(creator).query(api.objectiveAccess.getObjectiveAccess, { objectiveId })
        ).toEqual({
            memberAccess: 'none',
            users: [{ userId: member.docId, name: 'member', email: member.email, access: 'edit' }],
        });
        await logProgress(member, objectiveId);

        await as(admin).mutation(api.objectiveAccess.updateObjectiveAccess, {
            objectiveId,
            memberAccess: 'none',
            users: [],
        });
        expect(await as(member).query(api.objectives.getObjective, { id: objectiveId })).toBeNull();
        await expect(logProgress(member, objectiveId)).rejects.toThrow('OBJECTIVE_NOT_FOUND');
    });

    test('only members of the organization can receive individual permissions @INH-PER-01', async () => {
        const objectiveId = await createObjective();

        const outsider = await createTestUser(t, {
            userId: 'outsider',
            email: 'outsider@example.com',
            name: 'outsider',
            role: 'user',
        });

        const update = (users: { userId: Id<'user'>; access: 'view' | 'edit' }[]) =>
            as(owner).mutation(api.objectiveAccess.updateObjectiveAccess, {
                objectiveId,
                memberAccess: 'view',
                users,
            });

        await expect(update([{ userId: outsider.docId, access: 'view' }])).rejects.toThrow(
            'USER_NOT_FOUND'
        );
        await expect(
            update([
                { userId: member.docId, access: 'view' },
                { userId: member.docId, access: 'edit' },
            ])
        ).rejects.toThrow('VALIDATION_ERROR');
        expect(
            await as(owner).query(api.objectiveAccess.getObjectiveAccess, { objectiveId })
        ).toEqual({ memberAccess: 'view', users: [] });
    });

    test('the global admin role gives no access to objectives @REQ-NF-003', async () => {
        const objectiveId = await createObjective({ memberAccess: 'none' });
        const globalAdmin = await joinAs('member', 'global-admin', GLOBAL_ADMIN_ROLE);

        expect(await listIds(globalAdmin)).toEqual([]);
        expect(
            await as(globalAdmin).query(api.objectives.getObjective, { id: objectiveId })
        ).toBeNull();
    });

    test('leaving the organization removes individual permissions and keeps the objectives @REQ-COLABORACION-005', async () => {
        const objectiveId = await createObjective({
            memberAccess: 'none',
            users: [
                { userId: member.docId, access: 'edit' },
                { userId: teammate.docId, access: 'view' },
            ],
        });

        await t.mutation(internal.objectiveAccess.removeMemberAccess, {
            userId: member.docId,
            organizationId,
        });

        expect(
            await as(creator).query(api.objectiveAccess.getObjectiveAccess, { objectiveId })
        ).toMatchObject({ users: [{ userId: teammate.docId, access: 'view' }] });
        expect(
            await as(creator).query(api.objectives.getObjective, { id: objectiveId })
        ).not.toBeNull();
    });

    test('the dashboard counts shared objectives plus the private ones each user can see @INH-DAS-04', async () => {
        await createObjective();
        await createObjective({ memberAccess: 'none' });
        await createObjective({
            memberAccess: 'none',
            users: [{ userId: member.docId, access: 'view' }],
        });

        const total = async (user: TestUserData) =>
            (await as(user).query(api.dashboard.getDashboardStats, {})).total;

        expect(await total(owner)).toBe(3);
        expect(await total(creator)).toBe(3);
        expect(await total(member)).toBe(2);
        expect(await total(teammate)).toBe(1);
    });

    test('purging an objective removes its permissions @INH-PAP-03', async () => {
        const objectiveId = await createObjective({
            users: [{ userId: member.docId, access: 'edit' }],
        });

        await as(creator).mutation(api.objectives.deleteObjective, { id: objectiveId });
        await as(creator).mutation(api.trash.purgeObjective, { id: objectiveId });

        await t.run(async ctx => {
            expect(
                await ctx.db
                    .query('objectivePermissions')
                    .withIndex('by_objective_user', q => q.eq('objectiveId', objectiveId))
                    .first()
            ).toBeNull();
        });
    });
});
