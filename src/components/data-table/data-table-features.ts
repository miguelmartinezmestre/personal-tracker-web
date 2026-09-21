import { rowPaginationFeature, tableFeatures } from '@tanstack/react-table';

export const dataTableFeatures = tableFeatures({
    rowPaginationFeature,
});

export type DataTableFeatures = typeof dataTableFeatures;
