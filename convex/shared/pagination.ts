import type {
    IndexNames,
    NamedTableInfo,
    PaginationOptions,
    PaginationResult,
} from 'convex/server';
import { ConvexError } from 'convex/values';
import { getPage, type IndexKey } from 'convex-helpers/server/pagination';
import type { DataModel, Doc, TableNames } from '../_generated/dataModel';
import type { DatabaseReader } from '../_generated/server';
import schema from '../schema';
import { ERROR_CODES } from './errorCodes';

export async function withNextPageCheck<Table extends TableNames, Item>(
    db: DatabaseReader,
    options: {
        table: Table;
        index: IndexNames<NamedTableInfo<DataModel, Table>>;
        prefix: IndexKey;
        indexKey: (doc: Doc<Table>) => IndexKey;
        paginationOpts: PaginationOptions;
        order?: 'asc' | 'desc';
        isLive?: (doc: Doc<Table>) => boolean;
    },
    result: PaginationResult<Doc<Table>>,
    page: Item[]
): Promise<PaginationResult<Item>> {
    const last = result.page.at(-1);

    if (result.isDone || options.paginationOpts.endCursor || !last) {
        return { ...result, page };
    }

    const next = await getPage<DataModel, Table>(
        { db },
        {
            table: options.table,
            index: options.index,
            schema,
            order: options.order ?? 'desc',
            startIndexKey: [...options.indexKey(last), last._creationTime, last._id],
            endIndexKey: options.prefix,
            targetMaxRows: 1,
        }
    );

    const following = next.page.at(0);
    const hasNext = following !== undefined && (options.isLive?.(following) ?? true);

    return { ...result, isDone: !hasNext, page };
}

export const MAX_PAGE_ITEMS = 100;
export const MAX_PAGE_ROWS_READ = 500;
export const MAX_PAGE_BYTES_READ = 4 * 1024 * 1024;

function boundedPositiveInteger(value: number | undefined, fallback: number, maximum: number) {
    if (value === undefined) {
        return fallback;
    }

    if (!Number.isSafeInteger(value) || value <= 0) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }

    return Math.min(value, maximum);
}

export function withPaginationLimits(paginationOpts: PaginationOptions): PaginationOptions {
    return {
        ...paginationOpts,
        numItems: boundedPositiveInteger(paginationOpts.numItems, MAX_PAGE_ITEMS, MAX_PAGE_ITEMS),
        maximumRowsRead: boundedPositiveInteger(
            paginationOpts.maximumRowsRead,
            MAX_PAGE_ROWS_READ,
            MAX_PAGE_ROWS_READ
        ),
        maximumBytesRead: boundedPositiveInteger(
            paginationOpts.maximumBytesRead,
            MAX_PAGE_BYTES_READ,
            MAX_PAGE_BYTES_READ
        ),
    };
}
