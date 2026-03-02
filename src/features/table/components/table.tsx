import {
  ColumnDef,
  type RowData,
  type SortingState,
  useReactTable,
  getCoreRowModel,
  flexRender,
  getSortedRowModel,
} from '@tanstack/react-table';
import {
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Table,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DataTablePagination } from './data-table-pagination';

interface DataTableProps<TData extends RowData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  enableSorting?: boolean;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
    pageSize?: number;
    totalItems?: number;
  };
}

export function DataTable<TData extends RowData, TValue>({
  columns,
  data,
  isLoading = false,
  enableSorting = false,
  pagination,
}: DataTableProps<TData, TValue>) {
  const t = useTranslations('Table');
  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable<TData>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...(enableSorting
      ? {
          onSortingChange: setSorting,
          getSortedRowModel: getSortedRowModel(),
          state: { sorting },
        }
      : {}),
  });

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((_, index) => (
                <TableHead key={index}>
                  <Skeleton className="h-8 w-full" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array(5)
              .fill(0)
              .map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {Array(columns.length)
                    .fill(0)
                    .map((_, cellIndex) => (
                      <TableCell key={cellIndex}>
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
                  const canSort = enableSorting && header.column.getCanSort();
                  const sortState = header.column.getIsSorted();
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex w-full items-center gap-2 text-left"
                          aria-label={t('toggleSorting')}
                          data-testid={`table-sort-${header.column.id}`}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sortState === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5" />
                          ) : sortState === 'desc' ? (
                            <ArrowDown className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  data-testid="table-row"
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} data-testid="table-cell">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPageChange={pagination.onPageChange}
          hasNextPage={pagination.hasNextPage ?? !pagination.totalPages}
          hasPreviousPage={pagination.hasPreviousPage ?? pagination.currentPage > 0}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
        />
      )}
    </div>
  );
}

export { DataTableAdvanced } from './data-table-advanced';
