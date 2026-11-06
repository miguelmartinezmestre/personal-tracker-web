import type {
    FunctionArgs,
    FunctionReference,
    FunctionReturnType,
    PaginationOptions,
    PaginationResult,
} from 'convex/server';
import { components } from '../../_generated/api';
import type { Doc, TableNames as AuthTable } from '../../betterAuth/_generated/dataModel';
import { withPaginationLimits } from '../../shared/paginationLimits';

/**
 * Typed access to the Better Auth component through its own adapter functions. The app never
 * adds functions to the component: every read and write of the auth tables goes through here.
 */

export type { AuthTable };

/** A component document as the app sees it: ids of the component are plain strings. */
export type AuthDoc<Table extends AuthTable> = Omit<Doc<Table>, '_id'> & { _id: string };

type Run<Type extends 'query' | 'mutation'> = <Ref extends FunctionReference<Type, 'internal'>>(
    reference: Ref,
    args: FunctionArgs<Ref>
) => Promise<FunctionReturnType<Ref>>;

// Satisfied by query, mutation and action contexts alike.
export type AuthReader = { runQuery: Run<'query'> };

export type AuthWriter = AuthReader & { runMutation: Run<'mutation'> };

type WhereValue = string | number | boolean | string[] | number[] | null;

export type AuthWhere = {
    field: string;
    operator?: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'in' | 'not_in' | 'ne' | 'contains';
    value: WhereValue;
};

export type AuthSortBy = { field: string; direction: 'asc' | 'desc' };

type FindManyArgs = {
    where?: AuthWhere[];
    sortBy?: AuthSortBy;
};

// The adapter's mutation arguments are a union over every table, which a generic table type
function mutationInput(input: { model: AuthTable } & Record<string, unknown>): never {
    return input as never;
}

const adapter = components.betterAuth.adapter;

export async function findOne<Table extends AuthTable>(
    ctx: AuthReader,
    model: Table,
    where: AuthWhere[],
    sortBy?: AuthSortBy
): Promise<AuthDoc<Table> | null> {
    if (sortBy) {
        const result = await findMany(ctx, model, {
            where,
            sortBy,
            paginationOpts: { numItems: 1, cursor: null },
        });

        return result.page.at(0) ?? null;
    }

    return (await ctx.runQuery(adapter.findOne, { model, where })) as AuthDoc<Table> | null;
}

/** A document by id; a malformed id or one of another table reads as missing. */
export async function getById<Table extends AuthTable>(
    ctx: AuthReader,
    model: Table,
    id: string | null | undefined
): Promise<AuthDoc<Table> | null> {
    return id ? await findOne(ctx, model, [{ field: '_id', value: id }]) : null;
}

export async function findMany<Table extends AuthTable>(
    ctx: AuthReader,
    model: Table,
    args: FindManyArgs & { paginationOpts: PaginationOptions }
): Promise<PaginationResult<AuthDoc<Table>>> {
    return (await ctx.runQuery(adapter.findMany, {
        model,
        where: args.where,
        sortBy: args.sortBy,
        paginationOpts: args.paginationOpts,
    })) as PaginationResult<AuthDoc<Table>>;
}

/**
 * A page for the UI. `isDone` is exact: when more rows may follow, the next one is read so the
 * client never offers a "load more" that returns nothing.
 */
export async function findPage<Table extends AuthTable>(
    ctx: AuthReader,
    model: Table,
    args: FindManyArgs & {
        paginationOpts: PaginationOptions;
        isLive?: (doc: AuthDoc<Table>) => boolean;
    }
): Promise<PaginationResult<AuthDoc<Table>>> {
    const isLive = args.isLive ?? (() => true);

    const result = await findMany(ctx, model, {
        ...args,
        paginationOpts: withPaginationLimits(args.paginationOpts),
    });

    const live = result.page.filter(isLive);
    const page = { ...result, page: live };

    if (result.isDone || args.paginationOpts.endCursor || live.length < result.page.length) {
        return { ...page, isDone: result.isDone || live.length < result.page.length };
    }

    const next = await findMany(ctx, model, {
        ...args,
        paginationOpts: { numItems: 1, cursor: result.continueCursor },
    });

    const following = next.page.at(0);

    return { ...page, isDone: following ? !isLive(following) : next.isDone };
}

/** Every matching row, for lookups bounded by the data model (e.g. a user's memberships). */
export async function findAll<Table extends AuthTable>(
    ctx: AuthReader,
    model: Table,
    args: FindManyArgs & { limit?: number }
): Promise<AuthDoc<Table>[]> {
    const rows: AuthDoc<Table>[] = [];
    let cursor: string | null = null;

    for (;;) {
        const result: PaginationResult<AuthDoc<Table>> = await findMany(ctx, model, {
            ...args,
            paginationOpts: { numItems: 100, cursor },
        });

        rows.push(...result.page);

        if (result.isDone || (args.limit !== undefined && rows.length >= args.limit)) {
            return args.limit === undefined ? rows : rows.slice(0, args.limit);
        }

        cursor = result.continueCursor;
    }
}

export async function create<Table extends AuthTable>(
    ctx: AuthWriter,
    model: Table,
    data: Omit<AuthDoc<Table>, '_id' | '_creationTime'>
): Promise<AuthDoc<Table>> {
    return (await ctx.runMutation(adapter.create, {
        input: mutationInput({ model, data }),
    })) as AuthDoc<Table>;
}

export async function patchById<Table extends AuthTable>(
    ctx: AuthWriter,
    model: Table,
    id: string,
    update: Partial<Omit<AuthDoc<Table>, '_id' | '_creationTime'>>
): Promise<void> {
    await ctx.runMutation(adapter.updateOne, {
        input: mutationInput({ model, update, where: [{ field: '_id', value: id }] }),
    });
}

/** Patches up to `batchSize` matching rows; `remaining` means more may match. */
export async function patchWhere<Table extends AuthTable>(
    ctx: AuthWriter,
    model: Table,
    where: AuthWhere[],
    update: Partial<Omit<AuthDoc<Table>, '_id' | '_creationTime'>>,
    batchSize: number
): Promise<{ count: number; remaining: boolean }> {
    const result = (await ctx.runMutation(adapter.updateMany, {
        input: mutationInput({ model, update, where }),
        paginationOpts: { numItems: batchSize, cursor: null },
    })) as { count: number; isDone: boolean };

    return { count: result.count, remaining: !result.isDone };
}

export async function deleteById(ctx: AuthWriter, model: AuthTable, id: string): Promise<void> {
    await ctx.runMutation(adapter.deleteOne, {
        input: mutationInput({ model, where: [{ field: '_id', value: id }] }),
    });
}

/** Deletes up to `batchSize` matching rows; `remaining` means more may match. */
export async function deleteWhere(
    ctx: AuthWriter,
    model: AuthTable,
    where: AuthWhere[],
    batchSize: number
): Promise<{ count: number; remaining: boolean }> {
    const result = (await ctx.runMutation(adapter.deleteMany, {
        input: mutationInput({ model, where }),
        paginationOpts: { numItems: batchSize, cursor: null },
    })) as { count: number; isDone: boolean };

    return { count: result.count, remaining: !result.isDone };
}
