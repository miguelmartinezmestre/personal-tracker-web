---
name: convex-pagination
description: >-
    Design, implement, and review Convex pagination: paginate, paginationOptsValidator,
    usePaginatedQuery, infinite scroll, load more, tables with pages 1, 2, 3, previous/next
    navigation, cursors, filters, sorting, caching, TanStack Table, and direct access with
    Aggregate. Use when creating or repairing paginated Convex lists, especially for duplicates,
    gaps, empty pages, expensive queries, or invalid cursors.
metadata:
    version: '1.0.0'
    reviewed: '2026-09-28'
---

# Correct Pagination in Convex

## Goal

Implement the pagination model the product needs without hiding its costs or guarantees. Separate
**how data is queried**, **how consistency is maintained**, and **how navigation is presented**. A
`1 2 3` control does not necessarily imply random access, fixed page sizes, a known total, or a
snapshot of the data.

This skill defines implementation criteria, not a universal hook to copy. Adapt examples,
permissions, routes, and budgets to the project. Follow
[version and source verification](#version-and-source-verification) when deciding which guarantees
an API or an existing implementation actually provides.

## Workflow

1. **Inspect before editing.** Read dependencies and the lockfile, schema, indexes,
   authentication/authorization, existing queries, hooks, tables, and tests. Check signatures in the
   installed version; do not assume an experimental API, helper, or option from another version is
   available.
2. **Identify the product contract.** Determine whether it needs load more, visited pages, direct
   jumps to any page, an exact total, live updates, fixed page sizes, URL restoration, or exports.
   Reuse requirements already provided. If a missing detail is not blocking, state a conservative
   choice and continue.
3. **Choose the least sufficient complexity.** Use the following table. Do not create three hooks or
   add backend components for hypothetical requirements.
4. **Design the query, ordering, and permissions together.** Review the effects of inserts, deletes,
   and changes to sort keys.
5. **Implement and test.** Cover errors, empty states, logical cancellation, invalidation, and
   limits; do not finish just because "Next" advances.
6. **Provide evidence.** Describe decisions, changed files, commands run, and limitations.
   Distinguish completed tests from proposed tests.

## Pattern selection

| Actual requirement                                | Starting point                                          | Limitation to explain                                           |
| ------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------- |
| Reactive feed or list with load more              | `.paginate()` + `usePaginatedQuery`                     | Accumulates results and subscriptions.                          |
| `1 2 3` for discovered pages                      | Cursor query + `page → cursor` registry                 | Does not know pages that have not been traversed.               |
| A few visual pages over already loaded results    | Native hook + local presentation windows                | Retains everything loaded; windows can shift.                   |
| Jump to any page and know the total               | Evaluate positional access with `@convex-dev/aggregate` | Requires a representable ordered set and maintenance on writes. |
| History or search without a real-time requirement | One-shot queries + cursor                               | Does not guarantee a shared snapshot across requests.           |
| Unions, paginated joins, or special ranges        | Evaluate `convex-helpers`                               | Verify capabilities, ordering, and composition.                 |
| Exact export of a changing set                    | Snapshot/versioning design in addition to pagination    | A cursor does not freeze the database.                          |

These architectural choices are recommendations from this skill, not an official classification of
every Convex use case. Read [numbered pagination](#numbered-pagination) before implementing numbered
controls.

## Backend contract

For native pagination, keep `paginationOptsValidator`, pass the options to `.paginate()`, and return
its complete result. When enriching documents, replace `page` while preserving the rest of the
object with spread. Do not reconstruct a reduced result that loses pagination metadata.

Apply these review rules:

- Resolve identity on the server and check resource access on every request. A client-provided
  `projectId`, `tenantId`, cursor, or count does not establish authorization.
- Choose an index whose prefix, range, and ordering match the query. `.order("desc")` reverses the
  selected index order; it does not sort by any arbitrary UI column. Do not sort only `page` and
  present it as global sorting.
- Preserve all received options, including internal client options. Do not manually recreate the
  validator with only `cursor` and `numItems`.
- Set server read budgets where appropriate. A small requested page size does not by itself bound
  filtering or join work. Limits on `.paginate()` do not automatically cover additional enrichment
  reads.
- Verify engine exceptions, including whether `maximumRowsRead` and `maximumBytesRead` apply to
  search queries in the installed version. Do not promise search protection from those options
  alone.
- For ordinary joins, paginate first and enrich afterward without changing the order. If the join
  determines membership in the result set, also design indexes, denormalization, or bounded
  filtering. Do not call a partial slice a "full page."
- Do not add multiple native `.paginate()` calls within one execution assuming the client can
  coordinate them. Evaluate helpers or separate queries and verify the installed version's
  restrictions.
- Inside a **Convex Component**, check the documented `paginator` approach and compatible helpers
  hook. Do not confuse a Convex Component with a React component.

Use the following implementation sequence to combine these constraints.

### Backend implementation sequence

1. Resolve the authenticated principal and authorize the requested scope.
2. Select the index, range, and ordering for the effective tenant and filters.
3. Preserve pagination options, apply explicit supported read budgets, and paginate.
4. Enrich only the returned page while preserving pagination metadata. Account for extra reads; if
   enrichment filters rows, retain continuation through empty pages.
5. Connect the result to the chosen client contract and exercise the [test matrix](#test-matrix)
   below.

## Client invariants

**Cursor and end state.** Treat the native cursor as opaque. The first query starts with `null`;
`undefined` in a map means "unknown," not "first page." `isDone` or the hook's status determines the
end, not the row count. An empty page can have a continuation.

**Query identity.** Partition state by function, effective arguments, ordering, UI page size,
identity/tenant, and contract version. Do not mix session data. When this identity changes, reset or
restore only the matching namespace before querying with another cursor.

**Races.** Every asynchronous response must belong to the current generation, namespace, and
requested page descriptor. An old response can be discarded; it must never overwrite the current
filter or complete another user's page. Deduplicate in-flight requests; use request identifiers so
an old `finally` does not release a newer request's lock.

**Errors.** Do not turn network or permission failures into `Exhausted`. Keep a retry path. On an
invalid cursor, invalidate its chain and restart within bounded limits; do not use an infinite reset
loop. Do not base logic on unstable error messages without a verified adapter.

**Cache.** Cursors, data, and subscriptions are separate resources. Decide what to retain and what
to revalidate. Use limits and isolation; do not turn a global SSR `Map` into a shared cache of
authenticated data. TTL does not establish cursor validity or freshness. Clear relevant state on
sign-out and known permission changes.

## Numbered pagination

For incremental navigation, retain each page's starting cursor and enable only reachable
destinations. A valid response's `continueCursor` discovers the next destination; it does not grant
access to every page. Do not confuse `knownPages`, `loadedPages`, and `totalPages`.

**Do not attribute reactive consistency to a cursor map.** A page queried only with a start and size
can move its end when data changes. Contiguous ranges need end boundaries and split handling, or
delegation to an implementation that handles them. These ranges can grow or shrink; they are not
permanent blocks of exactly twenty rows.

Choose and document the semantics before implementing `1 2 3`:

- **Visit-based navigation:** independent pages with explicit refresh/invalidation of successor
  cursors; no promise of snapshots or historical continuity.
- **Stable reactive ranges:** start/end boundaries, splits, and consistent publication; variable
  size. Prefer maintained, tested code over reimplementation.
- **Positional pages:** a total and access by ordinal range, for example with Aggregate; records can
  move between pages when the set changes.

For arbitrary jumps, do not claim that "Convex cannot do it." Evaluate Aggregate, materialization,
or a maintained positional index. Do not confuse `collect().slice()` with efficient ordinal access
either.

## Filters, ordering, and tables

Apply global filtering and ordering on the backend. Identify local transformations as local. Never
use the loaded row count as the filtered collection's total. A total is useful only when it shares
the permissions, membership, and ordering/semantics of the query it describes.

If a table receives a single server page, configure manual pagination. Do not paginate those rows
again in TanStack Table. Delegate buttons to the actual controller: an unknown total cannot by
itself determine that "Next" exists. For variable-size ranges, do not truncate rows to force the
nominal size.

If filtering after reads, accept short/empty pages or implement additional loading with a budget and
protection against lack of progress. "No matches in this range" does not mean "no matches remain."

## Anti-patterns to reject

| Anti-pattern                                                          | Replacement or condition for acceptance                                          |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Unbounded `collect()` + `slice()` to simulate pages                   | Cursor, indexed ordinal access, or a genuinely small bounded set.                |
| `take(page * pageSize)` presented as an efficient jump                | Acknowledge the prefix scan and change the architecture if it must scale.        |
| Converting the cursor to an integer or fabricating one                | Preserve the token; identify any custom protocol as such.                        |
| Adding a previous/next library and assuming random access             | Verify its contract and the pages actually reachable.                            |
| Concatenating pages with moving boundaries and deduplicating by `_id` | Correct boundaries/invalidation; deduplication cannot recover omitted documents. |
| Ignoring `SplitRequired` or losing `splitCursor`                      | Delegate or implement splits; do not publish an incomplete response.             |
| Updating the cursor map from an old response                          | Query identity, generation, and request ID.                                      |
| Changing a filter in an effect after querying with an old cursor      | Reset by identity before the query or use a controlled remount.                  |
| Exporting only the hook's `results` as "everything"                   | Separate paginated export and consistency contract.                              |
| Copying an OSS wrapper without examining its guarantees               | Audit the implementation and test it with concurrent writes.                     |

## Test matrix

Select the cases relevant to the chosen contract and assert the visible result, request scope, and
termination behavior, not just successful button clicks.

| Scenario                                                 | Required evidence                                                                                     |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| First page, empty page with continuation, and actual end | Start with `null`; allow continuation through empty pages; stop on the declared end state.            |
| Filter, sort, page-size, tenant, or identity change      | Query the matching namespace without reusing a cursor from the previous scope.                        |
| Late responses and duplicate in-flight requests          | Publish only the current generation; an old completion cannot unlock a newer request.                 |
| Concurrent insert, delete, or sort-key change            | Preserve the documented visit, range, or positional semantics; test page boundaries explicitly.       |
| Filtering, joins, and read limits                        | Enforce permissions and budgets, support short pages, and terminate when no progress is possible.     |
| Invalid cursor or required split                         | Perform bounded recovery or supported split handling without silently treating failure as exhaustion. |
| Network failure, sign-out, or permission change          | Preserve recoverable errors and isolate cached data between sessions and permission scopes.           |
| Numbered navigation and totals                           | Enable only supported destinations; ensure totals describe the same authorized result set.            |
| Export, when supported                                   | Traverse the export separately and verify the selected consistency contract.                          |

## Completion criteria

The task is complete when:

1. The UI offers exactly the navigation the backend can resolve.
2. The server preserves permissions, ordering, and budgets; types are not silenced with `any` to
   bypass a disagreement between frontend and backend.
3. Filter changes, late responses, actual end states, empty pages, and concurrent changes have been
   tested according to the selected semantics.
4. Cross-user cache isolation and invalid-cursor recovery have been verified.
5. Available checks have been run and missing checks have been reported.

Use the [test matrix](#test-matrix). For decisions based on existing projects, apply
[version and source verification](#version-and-source-verification) as well; external examples do
not replace those tests.

## Version and source verification

- Check installed package versions, type definitions, source, and bundled docs before adopting an
  API. Use official documentation matching the relevant version to verify limits, pagination splits,
  and Convex Component compatibility.
- Record the source and version supporting any claimed guarantee. Distinguish documented API
  behavior from this skill's architectural recommendations.
- When evaluating an OSS wrapper, inspect its actual boundary, invalidation, permission, and cache
  behavior. Test concurrent writes under the selected contract rather than treating a
  similar-looking UI as evidence of equivalent guarantees.
