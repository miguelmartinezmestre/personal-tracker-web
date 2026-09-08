import { DirectAggregate } from '@convex-dev/aggregate';
import { components } from '../../_generated/api';
import type { Doc, Id } from '../../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../../_generated/server';
import { computeProgressPercent } from '../objectives/metrics';

export type ObjectiveMetricKey = [kind: string, status: string, value: number];
export const objectiveAggregate = new DirectAggregate<{
    Namespace: string;
    Key: ObjectiveMetricKey;
    Id: Id<'objectives'>;
}>(components.dashboardObjectives);
export const progressAggregate = new DirectAggregate<{
    Namespace: string;
    Key: number;
    Id: Id<'progressUpdates'>;
}>(components.dashboardProgress);

export function objectiveNamespace(
    organizationId: Id<'organization'>,
    generation: number,
    audience: string
): string {
    return `${organizationId}/${generation}/objectives/${audience}`;
}

export function progressNamespace(
    organizationId: Id<'organization'>,
    generation: number,
    authorId: Id<'user'>,
    admin: boolean
): string {
    return `${organizationId}/${generation}/progress/${authorId}/${admin ? 'admin' : 'member'}`;
}

export function objectiveMetricKeys(objective: Doc<'objectives'>): ObjectiveMetricKey[] {
    if (objective.deletedAt !== undefined) {
        return [];
    }
    const keys: ObjectiveMetricKey[] = [
        ['status', objective.status, 0],
        ['progress', objective.status, computeProgressPercent(objective)],
        ['created', '', objective.createdAt],
    ];
    if (objective.status === 'completed' && objective.completedAt !== undefined) {
        keys.push(['completed', '', objective.completedAt]);
    }
    if (objective.status === 'active' && objective.deadline !== undefined) {
        keys.push(['deadline', '', objective.deadline]);
    }
    return keys;
}

export async function collaboratorIds(
    ctx: QueryCtx | MutationCtx,
    objectiveId: Id<'objectives'>
): Promise<Id<'user'>[]> {
    const ids: Id<'user'>[] = [];
    for await (const row of ctx.db
        .query('objectiveCollaborators')
        .withIndex('by_objective', q => q.eq('objectiveId', objectiveId))) {
        ids.push(row.userId);
    }
    return ids;
}

export function objectiveAudiences(
    objective: Doc<'objectives'>,
    collaborators: readonly Id<'user'>[]
): string[] {
    if (objective.visibility === 'organization') {
        return ['admin', 'shared'];
    }
    return [
        'admin',
        ...[...new Set([objective.ownerId, ...collaborators])].map(id => `user:${id}`),
    ];
}

export async function trackNamespace(
    ctx: MutationCtx,
    organizationId: Id<'organization'>,
    namespace: string,
    kind: 'objectives' | 'progress'
): Promise<void> {
    const existing = await ctx.db
        .query('dashboardNamespaces')
        .withIndex('by_namespace_kind', q => q.eq('namespace', namespace).eq('kind', kind))
        .first();
    if (!existing) {
        await ctx.db.insert('dashboardNamespaces', { organizationId, namespace, kind });
    }
}

export async function writeObjectiveEntries(
    ctx: MutationCtx,
    objective: Doc<'objectives'>,
    generation: number,
    audiences: readonly string[],
    remove: boolean
): Promise<void> {
    const keys = objectiveMetricKeys(objective);
    for (const audience of audiences) {
        const namespace = objectiveNamespace(objective.organizationId, generation, audience);
        if (!remove && keys.length) {
            await trackNamespace(ctx, objective.organizationId, namespace, 'objectives');
        }
        for (const key of keys) {
            if (remove) {
                await objectiveAggregate.deleteIfExists(ctx, { namespace, key, id: objective._id });
            } else {
                await objectiveAggregate.insertIfDoesNotExist(ctx, {
                    namespace,
                    key,
                    id: objective._id,
                });
            }
        }
    }
}
