import type { ReactNode } from 'react';
import { QueryErrorFallback } from '@/components/ui/query-error-fallback';
import { type ColumnDef, type RowData, useTable, flexRender } from '@tanstack/react-table';
import {
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
    Table,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from 'next-intl';
import { DataTablePagination } from './data-table-pagination';
import { dataTableFeatures, type DataTableFeatures } from '../data-table-features';

interface DataTableProps<TData extends RowData> {
    columns: ColumnDef<DataTableFeatures, TData>[];
    data: TData[];
    isLoading?: boolean;
    isError?: boolean;
    error?: unknown;
    onRetry?: () => void;
    pagination?: {
        onNextPage: () => void;
        onPreviousPage: () => void;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        isLoading?: boolean;
    };
    emptyMessage?: ReactNode;
    // Extra classes for a column's header and cells, keyed by column id (e.g. to hide on mobile).
    columnClassNames?: Partial<Record<string, string>>;
}

export function DataTable<TData extends RowData>({
    columns,
    data,
    isLoading = false,
    isError = false,
    error,
    onRetry,
    pagination,
    emptyMessage,
    columnClassNames,
}: DataTableProps<TData>) {
    'use no memo';

    const t = useTranslations('Table');
    const table = useTable({
        features: dataTableFeatures,
        data,
        columns,
        manualPagination: true,
    });

    if (isError) {
        return <QueryErrorFallback error={error} onRetry={onRetry} />;
    }

    if (isLoading) {
        return (
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {columns.map((_, colIdx) => (
                                <TableHead key={`skeleton-head-${colIdx}`}>
                                    <Skeleton className="h-8 w-full" />
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array(5)
                            .fill(0)
                            .map((_, rowIndex) => (
                                <TableRow key={`skeleton-row-${rowIndex}`}>
                                    {Array(columns.length)
                                        .fill(0)
                                        .map((_, cellIndex) => (
                                            <TableCell
                                                key={`skeleton-cell-${rowIndex}-${cellIndex}`}
                                            >
                                                <Skeleton className="h-6 w-full" />
                                            </TableCell>
                                        ))}
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
            </div>
        );
    }

    let tableRows;
    if (table.getRowModel().rows.length) {
        tableRows = table.getRowModel().rows.map(row => (
            <TableRow key={row.id} data-testid="table-row">
                {row.getAllCells().map(cell => (
                    <TableCell
                        key={cell.id}
                        className={columnClassNames?.[cell.column.id]}
                        data-testid="table-cell"
                    >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                ))}
            </TableRow>
        ));
    } else {
        tableRows = (
            <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                    {emptyMessage ?? t('noResults')}
                </TableCell>
            </TableRow>
        );
    }

    return (
        <div className="space-y-3">
            <div className="rounded-md border">
                <Table data-testid="table">
                    <TableHeader>
                        {table.getHeaderGroups().map(headerGroup => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map(header => {
                                    const className = columnClassNames?.[header.column.id];
                                    if (header.isPlaceholder) {
                                        return <TableHead key={header.id} className={className} />;
                                    }
                                    return (
                                        <TableHead key={header.id} className={className}>
                                            {flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>{tableRows}</TableBody>
                </Table>
            </div>
            {pagination && (
                <DataTablePagination
                    onNextPage={pagination.onNextPage}
                    onPreviousPage={pagination.onPreviousPage}
                    hasNextPage={pagination.hasNextPage}
                    hasPreviousPage={pagination.hasPreviousPage}
                    rowCount={data.length}
                    isLoading={pagination.isLoading}
                />
            )}
        </div>
    );
}
