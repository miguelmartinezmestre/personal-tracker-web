import type { PaginationOptions } from 'convex/server';
import type { Doc, Id } from '../../_generated/dataModel';
import type { DatabaseReader } from '../../_generated/server';
import type { ObjectiveStatus } from '../../utils/constants';
import type { DeadlineRange } from './filters';
import { getDeadlineRangeBounds, matchesDeadlineRange } from './filters';
import { getCollaboratedObjectiveIdsForUser } from './collaborators';
import { buildPermissionSubject, canObjective, isOrganizationAdminRole } from './permissions';
import { isGlobalAdminRole } from '../../../shared/platform-roles';

const SEARCH_LIMIT = 50;

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
    userId: Id<'user'>;
    organizationId: Id<'organization'> | null;
    role: string;
    memberRole: string | null;
};

type ObjectiveListArgs = ObjectiveListFilters & {
    paginationOpts: PaginationOptions;
};

export type ObjectiveSearchArgs = ObjectiveListFilters & {
    search: string;
    limit?: number;
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

export function canUserViewObjectiveInList(
    ctx: ObjectiveListCtx,
    objective: Doc<'objectives'>,
    collaboratedObjectiveIds: Set<Id<'objectives'>>
): boolean {
    if (objective.deletedAt !== undefined) {
        if (isGlobalAdminRole(ctx.role) || isOrganizationAdminRole(ctx.memberRole)) {
            return true;
        }
        return objective.ownerId === ctx.userId;
    }

    const collaboratorRole = collaboratedObjectiveIds.has(objective._id)
        ? ('viewer' as const)
        : null;

    const subject = buildPermissionSubject({
        userId: ctx.userId,
        platformRole: ctx.role,
        memberRole: ctx.memberRole,
        collaboratorRole,
    });

    return canObjective('view', subject, objective);
}

export async function listObjectives(ctx: ObjectiveListCtx, args: ObjectiveListArgs) {
    const organizationId = ctx.organizationId;
    if (!organizationId) {
        return EMPTY_PAGE;
    }

    const filters = normalizeObjectiveListFilters(args);
    const paginationOpts = args.paginationOpts;
    const collaboratedObjectiveIds = await getCollaboratedObjectiveIdsForUser(
        ctx,
        ctx.userId,
        organizationId
    );

    const filterPage = (page: Doc<'objectives'>[]) =>
        page.filter(objective => {
            if (!matchesObjectiveFilters(objective, filters)) {
                return false;
            }
            return canUserViewObjectiveInList(ctx, objective, collaboratedObjectiveIds);
        });

    if (filters.deadlineRange) {
        const bounds = getDeadlineRangeBounds(filters.deadlineRange);
        let query = ctx.db.query('objectives').withIndex('by_organization_deadline', q => {
            const indexed = q.eq('organizationId', organizationId);
            return bounds.gte !== undefined
                ? indexed.gte('deadline', bounds.gte).lt('deadline', bounds.lt)
                : indexed.lt('deadline', bounds.lt);
        });

        const status = filters.status;
        if (status) {
            query = query.filter(q => q.eq(q.field('status'), status));
        }

        const categoryId = filters.categoryId;
        if (categoryId) {
            query = query.filter(q => q.eq(q.field('categoryId'), categoryId));
        }

        const visiblePage: Doc<'objectives'>[] = [];
        let cursor = paginationOpts.cursor;
        let continueCursor = '';
        let isDone = false;

        while (visiblePage.length < paginationOpts.numItems && !isDone) {
            const results = await query.order('desc').paginate({
                numItems: Math.max(1, paginationOpts.numItems - visiblePage.length),
                cursor,
            });
            visiblePage.push(...filterPage(results.page));
            continueCursor = results.continueCursor;
            isDone = results.isDone;
            cursor = results.continueCursor;
        }

        return {
            page: visiblePage,
            continueCursor,
            isDone,
        };
    }

    let query = ctx.db
        .query('objectives')
        .withIndex('by_organization', q => q.eq('organizationId', organizationId));

    const status = filters.status;
    if (status) {
        query = query.filter(q => q.eq(q.field('status'), status));
    }

    const categoryId = filters.categoryId;
    if (categoryId) {
        query = query.filter(q => q.eq(q.field('categoryId'), categoryId));
    }

    const visiblePage: Doc<'objectives'>[] = [];
    let cursor = paginationOpts.cursor;
    let continueCursor = '';
    let isDone = false;

    while (visiblePage.length < paginationOpts.numItems && !isDone) {
        const results = await query.order('desc').paginate({
            numItems: Math.max(1, paginationOpts.numItems - visiblePage.length),
            cursor,
        });
        visiblePage.push(...filterPage(results.page));
        continueCursor = results.continueCursor;
        isDone = results.isDone;
        cursor = results.continueCursor;
    }

    return {
        page: visiblePage,
        continueCursor,
        isDone,
    };
}

export async function searchObjectives(ctx: ObjectiveListCtx, args: ObjectiveSearchArgs) {
    const search = args.search.trim();
    const organizationId = ctx.organizationId;
    if (!organizationId || !search) {
        return [];
    }

    const filters = normalizeObjectiveListFilters(args);
    const limit = Math.min(Math.max(args.limit ?? SEARCH_LIMIT, 1), SEARCH_LIMIT);
    const collaboratedObjectiveIds = await getCollaboratedObjectiveIdsForUser(
        ctx,
        ctx.userId,
        organizationId
    );

    const query = ctx.db
        .query('objectives')
        .withSearchIndex('search_title_by_organization_status_categoryId', q =>
            q.search('title', search).eq('organizationId', organizationId)
        );

    return (await query.take(limit * 5))
        .filter(objective => matchesObjectiveFilters(objective, filters))
        .filter(objective => objective.title.toLowerCase().includes(search.toLowerCase()))
        .filter(objective => canUserViewObjectiveInList(ctx, objective, collaboratedObjectiveIds))
        .slice(0, limit);
}
