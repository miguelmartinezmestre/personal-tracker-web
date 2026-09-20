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
}

export function DataTable<TData extends RowData>({
    columns,
    data,
    isLoading = false,
    isError = false,
    error,
    onRetry,
    pagination,
}: DataTableProps<TData>) {
    'use no memo';

    const t = useTranslations('Table');
    // TanStack Table returns non-memoizable functions; React Compiler skips this hook by design.
    // react-doctor-disable-next-line react-hooks-js/incompatible-library -- useTable
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

    return (
        <div className="space-y-3">
            <div className="rounded-md border">
                <Table data-testid="table">
                    <TableHeader>
                        {table.getHeaderGroups().map(headerGroup => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map(header => {
                                    if (header.isPlaceholder) {
                                        return <TableHead key={header.id} />;
                                    }
                                    return (
                                        <TableHead key={header.id}>
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
                    <TableBody>
                        {table.getRowModel().rows.length ? (
                            table.getRowModel().rows.map(row => (
                                <TableRow key={row.id} data-testid="table-row">
                                    {row.getAllCells().map(cell => (
                                        <TableCell key={cell.id} data-testid="table-cell">
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    {t('noResults')}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
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
