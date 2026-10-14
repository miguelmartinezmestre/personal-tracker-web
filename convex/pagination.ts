import type { PaginationOptions, PaginationResult } from 'convex/server';
import { getPage, type IndexKey } from 'convex-helpers/server/pagination';
import type { DataModel, Doc, TableNames } from './_generated/dataModel';
import type { DatabaseReader } from './_generated/server';
import schema from './schema';

/**
 * A full page reports `isDone: false` even when nothing follows it, which leaves a dead "load
 * more". For the last loaded page (no endCursor) this reads the document right after it in the
 * same index range, so the query also reruns when one appears there later.
 *
 * `indexKey` returns the index fields of a document in index order, and `prefix` is the equality
 * part of the range the page was read from. `isLive` lets callers skip documents they hide.
 */
export async function withNextPageCheck<Table extends TableNames, Item>(
    db: DatabaseReader,
    options: {
        table: Table;
        index: string;
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
            index: options.index as never,
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
