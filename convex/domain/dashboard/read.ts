import { ConvexError } from 'convex/values';
import type { Id } from '../../_generated/dataModel';
import type { QueryCtx } from '../../_generated/server';
import { isOrganizationAdminRole } from '../../../shared/organization-roles';
import {
    objectiveAggregate,
    objectiveNamespace,
    progressAggregate,
    progressNamespace,
    type ObjectiveMetricKey,
} from './aggregates';

export type DashboardContext = QueryCtx & {
    userId: Id<'user'>;
    organizationId: Id<'organization'> | null;
    role: string;
    memberRole: string | null;
};

export async function dashboardScope(
    ctx: DashboardContext
): Promise<{ namespaces: string[]; progressNamespace: string } | null> {
    const organizationId = ctx.organizationId;
    if (!organizationId) {
        return null;
    }
    const state = await ctx.db
        .query('dashboardMigrations')
        .withIndex('by_organization', q => q.eq('organizationId', organizationId))
        .first();
    if (!state) {
        const anyObjective = await ctx.db
            .query('objectives')
            .withIndex('by_organization', q => q.eq('organizationId', organizationId))
            .first();
        if (!anyObjective) {
            return null;
        }
        throw new ConvexError('DASHBOARD_UPDATING');
    }
    const pending = await ctx.db
        .query('dashboardResyncs')
        .withIndex('by_organization_pending', q =>
            q.eq('organizationId', organizationId).eq('pending', true)
        )
        .first();
    if (state.phase !== 'ready' || pending) {
        throw new ConvexError('DASHBOARD_UPDATING');
    }
    const admin = ctx.role === 'globalAdmin' || isOrganizationAdminRole(ctx.memberRole ?? '');
    const audiences = admin ? ['admin'] : ['shared', `user:${ctx.userId}`];
    return {
        namespaces: audiences.map(audience =>
            objectiveNamespace(organizationId, state.generation, audience)
        ),
        progressNamespace: progressNamespace(organizationId, state.generation, ctx.userId, admin),
    };
}

export async function countObjectives(
    ctx: DashboardContext,
    namespaces: string[],
    {
        kind,
        lower,
        upper,
        status = '',
    }: { kind: string; lower: number; upper: number; status?: string }
): Promise<number> {
    const counts = await Promise.all(
        namespaces.map(namespace =>
            objectiveAggregate.count(ctx, {
                namespace,
                bounds: {
                    lower: { key: [kind, status, lower], inclusive: true },
                    upper: { key: [kind, status, upper], inclusive: false },
                },
            })
        )
    );
    return counts.reduce((sum, count) => sum + count, 0);
}

export async function countProgress(
    ctx: DashboardContext,
    namespace: string,
    lower: number,
    upper: number
): Promise<number> {
    return await progressAggregate.count(ctx, {
        namespace,
        bounds: { lower: { key: lower, inclusive: true }, upper: { key: upper, inclusive: false } },
    });
}

export async function rankedObjectives(
    ctx: DashboardContext,
    namespaces: string[],
    options: { kind: 'progress' | 'deadline'; limit: number; lower: number; upper: number }
) {
    const status = options.kind === 'progress' ? 'active' : '';
    const pages = await Promise.all(
        namespaces.map(namespace =>
            objectiveAggregate.paginate(ctx, {
                namespace,
                bounds: {
                    lower: { key: [options.kind, status, options.lower], inclusive: true },
                    upper: { key: [options.kind, status, options.upper], inclusive: false },
                },
                order: options.kind === 'progress' ? 'desc' : 'asc',
                pageSize: options.limit + 1,
            })
        )
    );
    const rank = (
        a: { key: ObjectiveMetricKey; id: string },
        b: { key: ObjectiveMetricKey; id: string }
    ) =>
        (options.kind === 'progress' ? b.key[2] - a.key[2] : a.key[2] - b.key[2]) ||
        a.id.localeCompare(b.id);
    const candidates = pages.flatMap(page => page.page).sort(rank);
    const unique = [...new Map(candidates.map(item => [item.id, item])).values()];
    const documents = await Promise.all(
        unique.slice(0, options.limit).map(item => ctx.db.get('objectives', item.id))
    );
    return {
        documents: documents.filter(document => document !== null),
        hasMore: unique.length > options.limit || pages.some(page => !page.isDone),
    };
}
