import type { IndexNames, NamedTableInfo, PaginationOptions, Query } from 'convex/server';
import type { IndexKey } from 'convex-helpers/server/pagination';
import type { DataModel, Doc, Id } from '../../_generated/dataModel';
import type { DatabaseReader } from '../../_generated/server';
import { withNextPageCheck, withPaginationLimits } from '../../shared/pagination';

type ObjectivesTable = NamedTableInfo<DataModel, 'objectives'>;

export type ObjectiveListFilters = {
    status: 'all' | Doc<'objectives'>['status'];
    categoryId?: Id<'categories'>;
    deadlineRange?: { from: number; to: number };
};

type IndexedListing = {
    query: Query<ObjectivesTable>;
    index: IndexNames<ObjectivesTable>;
    prefix: IndexKey;
    indexKey: (doc: Doc<'objectives'>) => IndexKey;
};

function newestFirst(
    db: DatabaseReader,
    organizationId: Id<'organization'>,
    { status, categoryId }: ObjectiveListFilters
): IndexedListing {
    const objectives = db.query('objectives');

    if (status !== 'all' && categoryId) {
        return {
            query: objectives.withIndex('by_organization_deletedAt_status_category_createdAt', q =>
                q
                    .eq('organizationId', organizationId)
                    .eq('deletedAt', undefined)
                    .eq('status', status)
                    .eq('categoryId', categoryId)
            ),
            index: 'by_organization_deletedAt_status_category_createdAt',
            prefix: [organizationId, undefined, status, categoryId],
            indexKey: doc => [
                doc.organizationId,
                doc.deletedAt,
                doc.status,
                doc.categoryId,
                doc.createdAt,
            ],
        };
    }

    if (status !== 'all') {
        return {
            query: objectives.withIndex('by_organization_deletedAt_status_createdAt', q =>
                q
                    .eq('organizationId', organizationId)
                    .eq('deletedAt', undefined)
                    .eq('status', status)
            ),
            index: 'by_organization_deletedAt_status_createdAt',
            prefix: [organizationId, undefined, status],
            indexKey: doc => [doc.organizationId, doc.deletedAt, doc.status, doc.createdAt],
        };
    }

    if (categoryId) {
        return {
            query: objectives.withIndex('by_organization_deletedAt_category_createdAt', q =>
                q
                    .eq('organizationId', organizationId)
                    .eq('deletedAt', undefined)
                    .eq('categoryId', categoryId)
            ),
            index: 'by_organization_deletedAt_category_createdAt',
            prefix: [organizationId, undefined, categoryId],
            indexKey: doc => [doc.organizationId, doc.deletedAt, doc.categoryId, doc.createdAt],
        };
    }

    return {
        query: objectives.withIndex('by_organization_deletedAt_createdAt', q =>
            q.eq('organizationId', organizationId).eq('deletedAt', undefined)
        ),
        index: 'by_organization_deletedAt_createdAt',
        prefix: [organizationId, undefined],
        indexKey: doc => [doc.organizationId, doc.deletedAt, doc.createdAt],
    };
}

function byDeadline(
    db: DatabaseReader,
    organizationId: Id<'organization'>,
    { status, categoryId }: ObjectiveListFilters,
    { from, to }: { from: number; to: number }
): IndexedListing {
    const objectives = db.query('objectives');

    if (status !== 'all' && categoryId) {
        return {
            query: objectives.withIndex('by_organization_deletedAt_status_category_deadline', q =>
                q
                    .eq('organizationId', organizationId)
                    .eq('deletedAt', undefined)
                    .eq('status', status)
                    .eq('categoryId', categoryId)
                    .gte('deadline', from)
                    .lt('deadline', to)
            ),
            index: 'by_organization_deletedAt_status_category_deadline',
            prefix: [organizationId, undefined, status, categoryId],
            indexKey: doc => [
                doc.organizationId,
                doc.deletedAt,
                doc.status,
                doc.categoryId,
                doc.deadline,
            ],
        };
    }

    if (status !== 'all') {
        return {
            query: objectives.withIndex('by_organization_deletedAt_status_deadline', q =>
                q
                    .eq('organizationId', organizationId)
                    .eq('deletedAt', undefined)
                    .eq('status', status)
                    .gte('deadline', from)
                    .lt('deadline', to)
            ),
            index: 'by_organization_deletedAt_status_deadline',
            prefix: [organizationId, undefined, status],
            indexKey: doc => [doc.organizationId, doc.deletedAt, doc.status, doc.deadline],
        };
    }

    if (categoryId) {
        return {
            query: objectives.withIndex('by_organization_deletedAt_category_deadline', q =>
                q
                    .eq('organizationId', organizationId)
                    .eq('deletedAt', undefined)
                    .eq('categoryId', categoryId)
                    .gte('deadline', from)
                    .lt('deadline', to)
            ),
            index: 'by_organization_deletedAt_category_deadline',
            prefix: [organizationId, undefined, categoryId],
            indexKey: doc => [doc.organizationId, doc.deletedAt, doc.categoryId, doc.deadline],
        };
    }

    return {
        query: objectives.withIndex('by_organization_deletedAt_deadline', q =>
            q
                .eq('organizationId', organizationId)
                .eq('deletedAt', undefined)
                .gte('deadline', from)
                .lt('deadline', to)
        ),
        index: 'by_organization_deletedAt_deadline',
        prefix: [organizationId, undefined],
        indexKey: doc => [doc.organizationId, doc.deletedAt, doc.deadline],
    };
}

// A deadline filter lists the soonest first; otherwise the newest objectives come first.
export async function paginateObjectives(
    db: DatabaseReader,
    organizationId: Id<'organization'>,
    filters: ObjectiveListFilters,
    paginationOpts: PaginationOptions
) {
    const range = filters.deadlineRange;
    const order = range ? 'asc' : 'desc';

    const listing = range
        ? byDeadline(db, organizationId, filters, range)
        : newestFirst(db, organizationId, filters);

    const result = await listing.query.order(order).paginate(withPaginationLimits(paginationOpts));

    return await withNextPageCheck(
        db,
        {
            table: 'objectives',
            index: listing.index,
            prefix: listing.prefix,
            indexKey: listing.indexKey,
            paginationOpts,
            order,
            // The next-page check reads past the range end, so documents beyond it don't count.
            isLive: range
                ? doc => doc.deadline !== undefined && doc.deadline < range.to
                : undefined,
        },
        result,
        result.page
    );
}

export async function searchObjectives(
    db: DatabaseReader,
    organizationId: Id<'organization'>,
    search: string,
    { status, categoryId, deadlineRange }: ObjectiveListFilters,
    paginationOpts: PaginationOptions
) {
    const result = await db
        .query('objectives')
        .withSearchIndex('search_title', q => {
            const inOrganization = q
                .search('title', search)
                .eq('organizationId', organizationId)
                .eq('deletedAt', undefined);

            const withStatus =
                status === 'all' ? inOrganization : inOrganization.eq('status', status);

            return categoryId ? withStatus.eq('categoryId', categoryId) : withStatus;
        })
        .paginate(withPaginationLimits(paginationOpts));

    if (!deadlineRange) {
        return result;
    }

    // Search filter fields only take equalities, so the deadline range is checked per page.
    // shortcut: a page can come back short or empty, move to an index if searches get slow.
    return {
        ...result,
        page: result.page.filter(
            doc =>
                doc.deadline !== undefined &&
                doc.deadline >= deadlineRange.from &&
                doc.deadline < deadlineRange.to
        ),
    };
}
