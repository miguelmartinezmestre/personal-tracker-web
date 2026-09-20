import { rowPaginationFeature, tableFeatures } from '@tanstack/react-table';

/**
 * Shared TanStack Table v9 features for app data tables.
 * Manual (server) pagination only — keep the feature set small for tree-shaking.
 */
export const dataTableFeatures = tableFeatures({
    rowPaginationFeature,
});

export type DataTableFeatures = typeof dataTableFeatures;
