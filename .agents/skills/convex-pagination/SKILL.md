---
name: convex-shadcn-pagination
description:
    Use this skill when implementing, reviewing, or refactoring pagination in a Convex +
    React/Next.js app using shadcn/ui Table/DataTable, TanStack Table, or cursor-based pagination.
    Trigger on tasks mentioning pagination, paginated tables, infinite scroll, load more, Convex
    paginate, usePaginatedQuery, shadcn Table, DataTable, server-side table pagination, sorting,
    filtering, cursors, previous/next pages, or admin tables.
---

# Convex + shadcn/ui Pagination Skill

## Goal

Implement pagination correctly for Convex-backed tables and lists.

The default architecture is:

- Convex owns real data pagination.
- shadcn/ui owns visual table/pagination components.
- TanStack Table may own row rendering, column visibility, sorting UI, row selection, and
  client-side table state.
- TanStack Table must not fake server pagination by loading the whole dataset unless the dataset is
  explicitly small and bounded.

## Core rules

### 1. Prefer Convex cursor pagination

For Convex data, prefer:

- Backend query with `paginationOpts: paginationOptsValidator`.
- Query chain ending in `.paginate(args.paginationOpts)`.
- Frontend using `usePaginatedQuery(...)`.
- UI pattern: `Load more`, `Next`, or infinite scroll.

Do not implement Convex pagination with:

- `.collect().slice(...)`
- `.take(N)` plus manual page numbers
- offset/page-number pagination
- fetching the full table and paginating in React for large or unbounded datasets

Bad:

```ts
const all = await ctx.db.query('objectives').collect();
return all.slice(page * pageSize, (page + 1) * pageSize);
```

Good:

```ts
return await ctx.db
    .query('objectives')
    .withIndex('by_organization_createdAt', q => q.eq('organizationId', args.organizationId))
    .order('desc')
    .paginate(args.paginationOpts);
```

### 2. Use indexes deliberately

Every paginated Convex query must have a clear access pattern.

Prefer:

```ts
.withIndex("by_organization_createdAt", (q) =>
  q.eq("organizationId", args.organizationId)
)
.order("desc")
.paginate(args.paginationOpts)
```

Avoid broad scans with late filters:

```ts
ctx.db
    .query('objectives')
    .filter(q => q.eq(q.field('organizationId'), args.organizationId))
    .paginate(args.paginationOpts);
```

Only use `.filter(...)` after an indexed query when the remaining scanned range is known to be small
or bounded.

When adding pagination, inspect `convex/schema.ts` first. If the table lacks the needed index, add
one.

Example schema:

```ts
objectives: defineTable({
    organizationId: v.id('organizations'),
    title: v.string(),
    status: v.union(v.literal('active'), v.literal('completed')),
    progress: v.number(),
    createdAt: v.number(),
}).index('by_organization_createdAt', ['organizationId', 'createdAt']);
```

### 3. Do not pretend cursor pagination has total pages

Convex cursor pagination does not naturally produce:

- total rows
- total pages
- jump to page 7
- reliable `Page X of Y`

Unless the project already has a separate counting/indexing strategy, avoid numbered pagination.

Prefer UI copy like:

- `Cargar más`
- `Mostrando 25 resultados`
- `No hay más resultados`
- `Siguiente`
- `Anterior` only if previous cursors are stored client-side

Do not render fake numbered pagination links for Convex cursor data.

### 4. shadcn/ui Table is presentational

The shadcn/ui `Table` component only renders table markup.

Use it like this:

```tsx
<Table>
    <TableHeader>
        <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Progreso</TableHead>
        </TableRow>
    </TableHeader>

    <TableBody>
        {results.map(row => (
            <TableRow key={row._id}>
                <TableCell>{row.title}</TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell>{row.progress}%</TableCell>
            </TableRow>
        ))}
    </TableBody>
</Table>
```

The pagination behavior must come from Convex, TanStack Table state, or explicit React state.

### 5. Use TanStack Table carefully

Use TanStack Table for:

- columns
- `flexRender`
- row selection
- column visibility
- sorting state UI
- filtering state UI
- rendering rows into shadcn/ui Table

For Convex server pagination:

- Avoid `getPaginationRowModel()` unless paginating already-loaded rows on the client.
- Prefer `manualPagination: true` if TanStack Table pagination state is used.
- Do not let TanStack Table imply that the full dataset is loaded.
- Do not use client-side filtering/sorting over a partial Convex page unless the UI clearly says it
  only filters/sorts loaded rows.

Acceptable client-side-only case:

```ts
// OK only for small, bounded, already-loaded datasets.
getPaginationRowModel: getPaginationRowModel();
```

Server-backed case:

```ts
const table = useReactTable({
    data: results,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
});
```

### 6. Sorting and filtering must reset pagination

Whenever these query arguments change, pagination must reset:

- search text
- status filter
- organization ID
- workspace ID
- date range
- sort key
- sort direction

With `usePaginatedQuery`, put these values in the query args object. Convex will treat it as a
different paginated query.

Example:

```tsx
const { results, status, loadMore } = usePaginatedQuery(
    api.objectives.listByOrganization,
    {
        organizationId,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: debouncedSearch,
        sort,
    },
    { initialNumItems: pageSize }
);
```

### 7. Page size must be explicit and bounded

Use a reasonable default:

- normal tables: 10, 20, 25, or 50
- heavy rows/documents: 10 or 20
- mobile: usually 10 or 20

If exposing page size selection, restrict values:

```ts
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
```

Do not allow arbitrary user-controlled `numItems`.

### 8. Consider maximum rows/bytes for expensive queries

For queries that may scan many rows before finding enough matches, use Convex pagination limits
where appropriate:

```ts
paginate({
    ...args.paginationOpts,
    maximumRowsRead: 500,
});
```

Use this especially when:

- filtering is not fully covered by an index
- documents are large
- query selectivity is poor
- the table is in an admin dashboard over large data

### 9. Auth and tenancy before pagination

For organization/workspace-scoped data:

- Verify the user session.
- Verify organization membership/role.
- Query using tenant-scoped indexes.
- Never paginate a global table and filter unauthorized rows after fetching.

Bad:

```ts
const page = await ctx.db.query('objectives').paginate(args.paginationOpts);
return page.page.filter(doc => canRead(user, doc));
```

Good:

```ts
const membership = await requireOrgMembership(ctx, args.organizationId);

return await ctx.db
    .query('objectives')
    .withIndex('by_organization_createdAt', q => q.eq('organizationId', args.organizationId))
    .order('desc')
    .paginate(args.paginationOpts);
```

## Backend template

Use this template when creating a Convex paginated query:

```ts
import { paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';
import { query } from './_generated/server';

export const listPaginated = query({
    args: {
        organizationId: v.id('organizations'),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        // TODO: replace with project-specific auth helper.
        // await requireOrgMembership(ctx, args.organizationId);

        return await ctx.db
            .query('objectives')
            .withIndex('by_organization_createdAt', q =>
                q.eq('organizationId', args.organizationId)
            )
            .order('desc')
            .paginate(args.paginationOpts);
    },
});
```

For optional filters, prefer designing indexes around common access patterns:

```ts
export const listPaginated = query({
    args: {
        organizationId: v.id('organizations'),
        status: v.optional(v.union(v.literal('active'), v.literal('completed'))),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        if (args.status !== undefined) {
            return await ctx.db
                .query('objectives')
                .withIndex('by_organization_status_createdAt', q =>
                    q.eq('organizationId', args.organizationId).eq('status', args.status)
                )
                .order('desc')
                .paginate(args.paginationOpts);
        }

        return await ctx.db
            .query('objectives')
            .withIndex('by_organization_createdAt', q =>
                q.eq('organizationId', args.organizationId)
            )
            .order('desc')
            .paginate(args.paginationOpts);
    },
});
```

Schema indexes for the previous query:

```ts
objectives: defineTable({
    organizationId: v.id('organizations'),
    status: v.union(v.literal('active'), v.literal('completed')),
    title: v.string(),
    progress: v.number(),
    createdAt: v.number(),
})
    .index('by_organization_createdAt', ['organizationId', 'createdAt'])
    .index('by_organization_status_createdAt', ['organizationId', 'status', 'createdAt']);
```

## Frontend template: shadcn Table + Convex `usePaginatedQuery`

Use this for the default implementation:

```tsx
'use client';

import { usePaginatedQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

type ObjectivesTableProps = {
    organizationId: Id<'organizations'>;
};

const PAGE_SIZE = 20;

export function ObjectivesTable({ organizationId }: ObjectivesTableProps) {
    const { results, status, loadMore } = usePaginatedQuery(
        api.objectives.listPaginated,
        { organizationId },
        { initialNumItems: PAGE_SIZE }
    );

    const isLoadingInitial = status === 'LoadingFirstPage';
    const isLoadingMore = status === 'LoadingMore';
    const canLoadMore = status === 'CanLoadMore';

    return (
        <div className="space-y-4">
            <div className="overflow-hidden rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Título</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Progreso</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {isLoadingInitial ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    Cargando...
                                </TableCell>
                            </TableRow>
                        ) : results.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    No hay resultados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            results.map(objective => (
                                <TableRow key={objective._id}>
                                    <TableCell className="font-medium">{objective.title}</TableCell>
                                    <TableCell>{objective.status}</TableCell>
                                    <TableCell className="text-right">
                                        {objective.progress}%
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                    Mostrando {results.length} resultado{results.length === 1 ? '' : 's'}
                </p>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canLoadMore || isLoadingMore}
                    onClick={() => loadMore(PAGE_SIZE)}
                >
                    {isLoadingMore ? 'Cargando...' : canLoadMore ? 'Cargar más' : 'No hay más'}
                </Button>
            </div>
        </div>
    );
}
```

## Frontend template: shadcn DataTable + TanStack Table rendering only

Use this when the project already has reusable `columns`.

```tsx
'use client';

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

type DataTableProps<TData, TValue> = {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    emptyMessage?: string;
};

export function DataTable<TData, TValue>({
    columns,
    data,
    emptyMessage = 'No hay resultados.',
}: DataTableProps<TData, TValue>) {
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
    });

    return (
        <div className="overflow-hidden rounded-md border">
            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map(headerGroup => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                                <TableHead key={header.id}>
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(
                                              header.column.columnDef.header,
                                              header.getContext()
                                          )}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>

                <TableBody>
                    {table.getRowModel().rows.length > 0 ? (
                        table.getRowModel().rows.map(row => (
                            <TableRow key={row.id}>
                                {row.getVisibleCells().map(cell => (
                                    <TableCell key={cell.id}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">
                                {emptyMessage}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
```

Then pair it with Convex pagination outside:

```tsx
const { results, status, loadMore } = usePaginatedQuery(
    api.objectives.listPaginated,
    { organizationId },
    { initialNumItems: PAGE_SIZE }
);

return (
    <div className="space-y-4">
        <DataTable columns={columns} data={results} />

        <Button
            variant="outline"
            size="sm"
            disabled={status !== 'CanLoadMore'}
            onClick={() => loadMore(PAGE_SIZE)}
        >
            {status === 'LoadingMore' ? 'Cargando...' : 'Cargar más'}
        </Button>
    </div>
);
```

## Previous/Next pagination with Convex cursors

Only implement previous/next if the UX explicitly requires it.

Rules:

- Store previous cursors in React state.
- Do not use numeric pages unless the backend has a real page index/count system.
- Disable `Previous` when there is no previous cursor.
- Disable `Next` when Convex says `isDone`.

Prefer `Load more` unless previous navigation is a product requirement.

Manual cursor pagination shape:

```ts
const firstPage = await convex.query(api.objectives.listPaginated, {
    organizationId,
    paginationOpts: {
        numItems: 20,
        cursor: null,
    },
});

const nextPage = await convex.query(api.objectives.listPaginated, {
    organizationId,
    paginationOpts: {
        numItems: 20,
        cursor: firstPage.continueCursor,
    },
});
```

## Sorting

When implementing sortable columns backed by Convex:

1. Check whether the requested sort field has an index.
2. If not, add an index or reject server-side sorting for that column.
3. Represent sort in query args.
4. Branch the Convex query based on the sort option.
5. Reset pagination when sort changes.

Example:

```ts
const sortValidator = v.union(
    v.literal('createdAt_desc'),
    v.literal('createdAt_asc'),
    v.literal('progress_desc'),
    v.literal('progress_asc')
);
```

For each supported sort, ensure there is an index compatible with the filter prefix and sort field.

Do not sort only the currently loaded page unless the UI explicitly says "sort loaded rows".

## Filtering/search

For filters:

- Put filter values in Convex query args.
- Prefer indexes for common filters.
- Debounce free-text search on the frontend.
- Reset pagination when filters change.
- Do not fetch all rows to filter client-side.

For search:

- Use Convex search indexes if the project uses them.
- Otherwise implement a constrained indexed prefix/filter strategy.
- Do not add unbounded `.collect()` for search.

## UI checklist

Every paginated table should handle:

- Initial loading state.
- Loading-more state.
- Empty state.
- Error state if the app has an error boundary/pattern.
- Disabled pagination controls while loading.
- Stable row keys using Convex `_id`.
- `colSpan={columns.length}` for empty/loading rows.
- Accessible button labels.
- Page size constant or controlled selector.
- No fake total pages.

## Review checklist

Before finishing, verify:

- [ ] Backend uses `paginationOptsValidator`.
- [ ] Backend returns `.paginate(args.paginationOpts)`.
- [ ] Query is scoped by organization/user/workspace where applicable.
- [ ] Query uses `.withIndex(...)` for the main access pattern.
- [ ] No `.collect().slice(...)` pagination.
- [ ] No unbounded client-side pagination for server data.
- [ ] shadcn Table is used as presentation only.
- [ ] TanStack Table does not use `getPaginationRowModel()` for unbounded Convex data.
- [ ] Filters/sort are query args and reset pagination.
- [ ] UI handles loading, empty, and no-more-results states.
- [ ] No numbered pages unless there is a real total/count strategy.
- [ ] TypeScript types use generated Convex `Id`/`Doc` types where appropriate.
- [ ] Existing project style, imports, aliases, and components are preserved.

## Anti-patterns to remove during refactors

Remove or replace:

```ts
.collect().then((rows) => rows.slice(...))
```

```ts
const [page, setPage] = useState(1);
// then passing page to Convex without cursor support
```

```tsx
getPaginationRowModel: getPaginationRowModel();
// when only one server page is loaded
```

```tsx
<PaginationLink>7</PaginationLink>
// with Convex cursor pagination and no real page index
```

```ts
.filter(...).paginate(...)
// on a broad table scan where an index should exist
```

## Implementation protocol for Codex

When asked to implement pagination:

1. Inspect:
    - `convex/schema.ts`
    - relevant `convex/*.ts` query files
    - relevant React table/list components
    - existing reusable `DataTable`, `columns`, `Pagination`, or `Button` components

2. Decide:
    - Is this Convex cursor pagination?
    - Is this a small bounded client-only table?
    - Does the UX require `Load more`, `Previous/Next`, or true numbered pages?

3. Implement:
    - Add/adjust Convex indexes.
    - Add/adjust paginated query.
    - Wire frontend with `usePaginatedQuery`.
    - Render with shadcn/ui `Table`.
    - Use TanStack Table only for table rendering/state when useful.

4. Validate:
    - Run typecheck/lint/tests according to the repo.
    - If commands are unknown, inspect `package.json`.
    - Report any missing index, unsupported sort, or product ambiguity explicitly.

## Preferred final response format

When reporting back after making changes, include:

- Files changed.
- Pagination strategy used.
- Query/index added or reused.
- UI behavior implemented.
- Commands run and whether they passed.
- Any limitations, especially around total pages or unsupported sorting.
