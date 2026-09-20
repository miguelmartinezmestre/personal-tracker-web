import { paginateVisible } from '../../utils/visiblePagination';
import { currentUtcCivilDay } from '../../../shared/civil-date';
import { canObjective, buildPermissionSubject } from './permissions';
import { getCollaboratorRoleForUser } from './collaborators';
import type { PaginationOptions } from 'convex/server';
import type { Doc, Id } from '../../_generated/dataModel';
import type { DatabaseReader } from '../../_generated/server';
import type { ObjectiveStatus } from '../../utils/constants';
import type { DeadlineRange } from './filters';
import { getDeadlineRangeBounds, matchesDeadlineRange } from './filters';

const EMPTY_PAGE = { page: [], continueCursor: '', isDone: true };

export type ObjectiveListFilters = {
    status?: ObjectiveStatus;
    categoryId?: Id<'categories'>;
    deadlineRange?: DeadlineRange;
};

type NormalizedObjectiveListFilters = {
    status: ObjectiveStatus | undefined;
    categoryId: Id<'categories'> | undefined;
    deadlineRange: DeadlineRange | undefined;
};

type ObjectiveListCtx = {
    db: DatabaseReader;
    dbForIntegrityChecks: DatabaseReader;
    userId: Id<'user'>;
    organizationId: Id<'organization'> | null;
    role: string;
    memberRole: string | null;
};

type ObjectiveListArgs = ObjectiveListFilters & {
    paginationOpts: PaginationOptions;
    deletionState?: 'active' | 'deleted';
};

export type ObjectiveSearchArgs = ObjectiveListFilters & {
    search: string;
};

type SearchableObjective = Pick<
    Doc<'objectives'>,
    '_id' | 'title' | 'categoryId' | 'deadline' | 'ownerId' | 'visibility' | 'deletedAt'
>;

export function normalizeObjectiveListFilters(
    filters: ObjectiveListFilters
): NormalizedObjectiveListFilters {
    return {
        status: filters.status,
        categoryId: filters.categoryId,
        deadlineRange: filters.deadlineRange,
    };
}

function matchesObjectiveFilters(
    objective: SearchableObjective & { status: ObjectiveStatus },
    filters: NormalizedObjectiveListFilters
) {
    if (filters.status && objective.status !== filters.status) {
        return false;
    }
    if (filters.categoryId && objective.categoryId !== filters.categoryId) {
        return false;
    }
    if (filters.deadlineRange && !matchesDeadlineRange(objective.deadline, filters.deadlineRange)) {
        return false;
    }

    return true;
}

type ObjectiveQueryArgs = {
    ctx: ObjectiveListCtx;
    organizationId: Id<'organization'>;
    deletionState: 'active' | 'deleted';
    status: ObjectiveStatus | undefined;
    categoryId: Id<'categories'> | undefined;
};

function queryObjectivesByDeadline(
    args: ObjectiveQueryArgs & { bounds: { gte: number; lt: number } }
) {
    const { ctx, organizationId, deletionState, status, categoryId, bounds } = args;

    if (deletionState === 'deleted') {
        return ctx.db
            .query('objectives')
            .withIndex('by_organization_deadline', q =>
                q
                    .eq('organizationId', organizationId)
                    .gte('deadline', bounds.gte)
                    .lt('deadline', bounds.lt)
            );
    }

    if (status && categoryId) {
        return ctx.db
            .query('objectives')
            .withIndex('by_organization_deletedAt_status_categoryId_deadline', q =>
                q
                    .eq('organizationId', organizationId)
                    .eq('deletedAt', undefined)
                    .eq('status', status)
                    .eq('categoryId', categoryId)
                    .gte('deadline', bounds.gte)
                    .lt('deadline', bounds.lt)
            );
    }

    if (status) {
        return ctx.db
            .query('objectives')
            .withIndex('by_organization_deletedAt_status_deadline', q =>
                q
                    .eq('organizationId', organizationId)
                    .eq('deletedAt', undefined)
                    .eq('status', status)
                    .gte('deadline', bounds.gte)
                    .lt('deadline', bounds.lt)
            );
    }

    if (categoryId) {
        return ctx.db
            .query('objectives')
            .withIndex('by_organization_deletedAt_categoryId_deadline', q =>
                q
                    .eq('organizationId', organizationId)
                    .eq('deletedAt', undefined)
                    .eq('categoryId', categoryId)
                    .gte('deadline', bounds.gte)
                    .lt('deadline', bounds.lt)
            );
    }

    return ctx.db
        .query('objectives')
        .withIndex('by_organization_deletedAt_deadline', q =>
            q
                .eq('organizationId', organizationId)
                .eq('deletedAt', undefined)
                .gte('deadline', bounds.gte)
                .lt('deadline', bounds.lt)
        );
}

function queryObjectivesByFilters(args: ObjectiveQueryArgs) {
    const { ctx, organizationId, deletionState, status, categoryId } = args;

    if (deletionState === 'deleted') {
        return ctx.db
            .query('objectives')
            .withIndex('by_organization_deletedAt', q =>
                q.eq('organizationId', organizationId).gt('deletedAt', 0)
            );
    }

    if (status && categoryId) {
        return ctx.db
            .query('objectives')
            .withIndex('by_organization_deletedAt_status_categoryId', q =>
                q
                    .eq('organizationId', organizationId)
                    .eq('deletedAt', undefined)
                    .eq('status', status)
                    .eq('categoryId', categoryId)
            );
    }

    if (status) {
        return ctx.db
            .query('objectives')
            .withIndex('by_organization_deletedAt_status', q =>
                q
                    .eq('organizationId', organizationId)
                    .eq('deletedAt', undefined)
                    .eq('status', status)
            );
    }

    if (categoryId) {
        return ctx.db
            .query('objectives')
            .withIndex('by_organization_deletedAt_categoryId', q =>
                q
                    .eq('organizationId', organizationId)
                    .eq('deletedAt', undefined)
                    .eq('categoryId', categoryId)
            );
    }

    return ctx.db
        .query('objectives')
        .withIndex('by_organization_deletedAt', q =>
            q.eq('organizationId', organizationId).eq('deletedAt', undefined)
        );
}

async function acceptsObjective(
    ctx: ObjectiveListCtx,
    objective: Doc<'objectives'>,
    filters: NormalizedObjectiveListFilters,
    deletionState: 'active' | 'deleted'
): Promise<boolean> {
    if (
        objective.organizationId !== ctx.organizationId ||
        (objective.deletedAt === undefined ? 'active' : 'deleted') !== deletionState ||
        !matchesObjectiveFilters(objective, filters)
    ) {
        return false;
    }
    const privileged =
        ctx.role === 'globalAdmin' || ctx.memberRole === 'owner' || ctx.memberRole === 'admin';
    const collaboratorRole =
        privileged || objective.ownerId === ctx.userId || objective.visibility === 'organization'
            ? null
            : await getCollaboratorRoleForUser(
                  { db: ctx.dbForIntegrityChecks },
                  objective._id,
                  ctx.userId
              );
    return canObjective(
        'view',
        buildPermissionSubject({
            userId: ctx.userId,
            platformRole: ctx.role,
            memberRole: ctx.memberRole,
            collaboratorRole,
        }),
        objective
    );
}

function pageScope(
    ctx: ObjectiveListCtx,
    filters: NormalizedObjectiveListFilters,
    deletionState: 'active' | 'deleted',
    search = ''
): string {
    return JSON.stringify([
        filters.deadlineRange ? currentUtcCivilDay() : null,
        ctx.userId,
        ctx.organizationId,
        filters.status,
        filters.categoryId,
        filters.deadlineRange,
        deletionState,
        search,
    ]);
}

export async function listObjectives(ctx: ObjectiveListCtx, args: ObjectiveListArgs) {
    const organizationId = ctx.organizationId;
    if (!organizationId) {
        return { ...EMPTY_PAGE, needsContinuation: false };
    }
    const deletionState = args.deletionState ?? 'active';
    const filters = normalizeObjectiveListFilters(args);
    const rawCtx = { ...ctx, db: ctx.dbForIntegrityChecks };
    return await paginateVisible<Doc<'objectives'>>({
        scope: pageScope(ctx, filters, deletionState),
        paginationOpts: args.paginationOpts,
        fetchPage: paginationOpts => {
            const query = filters.deadlineRange
                ? queryObjectivesByDeadline({
                      ctx: rawCtx,
                      organizationId,
                      deletionState,
                      status: filters.status,
                      categoryId: filters.categoryId,
                      bounds: getDeadlineRangeBounds(filters.deadlineRange),
                  })
                : queryObjectivesByFilters({
                      ctx: rawCtx,
                      organizationId,
                      deletionState,
                      status: filters.status,
                      categoryId: filters.categoryId,
                  });
            return query.order('desc').paginate(paginationOpts);
        },
        get: async id => {
            const normalized = ctx.db.normalizeId('objectives', id);
            return normalized ? await ctx.dbForIntegrityChecks.get('objectives', normalized) : null;
        },
        accepts: objective => acceptsObjective(ctx, objective, filters, deletionState),
    });
}

export async function searchObjectivesPage(
    ctx: ObjectiveListCtx,
    args: ObjectiveSearchArgs & { paginationOpts: PaginationOptions }
) {
    const search = args.search.trim();
    const organizationId = ctx.organizationId;
    if (!organizationId || !search) {
        return { ...EMPTY_PAGE, needsContinuation: false };
    }
    const filters = normalizeObjectiveListFilters(args);
    return await paginateVisible<Doc<'objectives'>>({
        scope: pageScope(ctx, filters, 'active', search),
        fingerprint: objective => objective.title,
        paginationOpts: args.paginationOpts,
        fetchPage: paginationOpts =>
            ctx.dbForIntegrityChecks
                .query('objectives')
                .withSearchIndex('search_title_by_organization_status_categoryId', q => {
                    let query = q
                        .search('title', search)
                        .eq('organizationId', organizationId)
                        .eq('deletedAt', undefined);
                    if (filters.status) {
                        query = query.eq('status', filters.status);
                    }
                    if (filters.categoryId) {
                        query = query.eq('categoryId', filters.categoryId);
                    }
                    return query;
                })
                .paginate(paginationOpts),
        get: async id => {
            const normalized = ctx.db.normalizeId('objectives', id);
            return normalized ? await ctx.dbForIntegrityChecks.get('objectives', normalized) : null;
        },
        accepts: objective => acceptsObjective(ctx, objective, filters, 'active'),
    });
}
