import {
    ColumnDef,
    type ColumnOrderState,
    type ColumnFiltersState,
    type FilterFn,
    type RowData,
    type SortingState,
    type VisibilityState,
    useReactTable,
    getCoreRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
    getFilteredRowModel,
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
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    ChevronDown,
    ChevronUp,
    Download,
    Eye,
    Filter,
    ListOrdered,
    RotateCcw,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DataTablePagination } from './data-table-pagination';

const createTextFilter = <TData extends RowData>(): FilterFn<TData> => {
    return (row, columnId, filterValue) => {
        const searchValue = String(filterValue ?? '').toLowerCase();
        if (!searchValue) {
            return true;
        }
        const value = row.getValue(columnId);
        if (value === null || value === undefined) {
            return false;
        }
        return String(value).toLowerCase().includes(searchValue);
    };
};

type ColumnMeta = {
    excludeFromExport?: boolean;
    disableColumnOrder?: boolean;
    disableColumnVisibility?: boolean;
    isAction?: boolean;
};

const getColumnMeta = (column: { columnDef?: { meta?: unknown } }) =>
    column.columnDef?.meta as ColumnMeta | undefined;

const formatExportValue = (value: unknown): string => {
    if (value === null || value === undefined) {
        return '';
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (Array.isArray(value)) {
        return value.map(entry => formatExportValue(entry)).join(', ');
    }
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    return String(value);
};

const escapeCsvValue = (value: unknown) => {
    const stringValue = formatExportValue(value).replace(/"/g, '""');
    return `"${stringValue}"`;
};

const getColumnLabel = (columnId: string, header: unknown) => {
    if (typeof header === 'string' || typeof header === 'number') {
        return String(header);
    }
    return columnId;
};

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

interface DataTableAdvancedProps<TData extends RowData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    isLoading?: boolean;
    enableSorting?: boolean;
    enableGlobalSearch?: boolean;
    enableColumnFilters?: boolean;
    enableColumnVisibility?: boolean;
    enableColumnOrder?: boolean;
    enableExport?: boolean;
    exportFileName?: string;
    searchPlaceholder?: string;
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
                                                    {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                                    {sortState === 'asc' ? (
                                                        <ArrowUp className="h-3.5 w-3.5" />
                                                    ) : sortState === 'desc' ? (
                                                        <ArrowDown className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
                                                    )}
                                                </button>
                                            ) : (
                                                flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )
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

export function DataTableAdvanced<TData extends RowData, TValue>({
    columns,
    data,
    isLoading = false,
    enableSorting = true,
    enableGlobalSearch = true,
    enableColumnFilters = true,
    enableColumnVisibility = true,
    enableColumnOrder = true,
    enableExport = true,
    exportFileName = 'table-export',
    searchPlaceholder,
    pagination,
}: DataTableAdvancedProps<TData, TValue>) {
    const t = useTranslations('Table');
    const resolvedSearchPlaceholder = searchPlaceholder ?? t('searchPlaceholder');
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);

    const textFilter = createTextFilter<TData>();
    const table = useReactTable<TData>({
        data,
        columns,
        state: {
            sorting,
            columnFilters,
            globalFilter,
            columnVisibility,
            columnOrder,
        },
        enableSorting,
        enableColumnFilters,
        enableGlobalFilter: enableGlobalSearch,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        onColumnOrderChange: setColumnOrder,
        globalFilterFn: textFilter,
        filterFns: {
            text: textFilter,
        },
        defaultColumn: {
            filterFn: textFilter,
        },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
    });

    const orderedVisibleColumns = table.getVisibleLeafColumns();
    const orderedColumns = table.getAllLeafColumns();
    const activeOrder = table.getState().columnOrder;
    const currentOrder =
        activeOrder.length > 0 ? activeOrder : orderedColumns.map(column => column.id);

    const orderableColumns = orderedColumns.filter(column => {
        const meta = getColumnMeta(column);
        return !(meta?.disableColumnOrder || meta?.isAction);
    });
    const orderableColumnIds = new Set(orderableColumns.map(column => column.id));
    const orderableOrder = currentOrder.filter(columnId => orderableColumnIds.has(columnId));

    const moveColumn = (columnId: string, direction: 'up' | 'down') => {
        const currentIndex = orderableOrder.indexOf(columnId);
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (currentIndex === -1 || targetIndex < 0 || targetIndex >= orderableOrder.length) {
            return;
        }
        const nextOrder = [...orderableOrder];
        [nextOrder[currentIndex] as string, nextOrder[targetIndex] as string] = [
            nextOrder[targetIndex] as string,
            nextOrder[currentIndex] as string,
        ];
        setColumnOrder(nextOrder);
    };

    const buildExportData = () => {
        const exportableColumns = orderedVisibleColumns.filter(column => {
            const meta = getColumnMeta(column);
            return !(meta?.excludeFromExport || meta?.isAction);
        });
        const headers = exportableColumns.map(column =>
            getColumnLabel(column.id, column.columnDef.header)
        );
        const rows = table
            .getRowModel()
            .rows.map(row =>
                exportableColumns.map(column => formatExportValue(row.getValue(column.id)))
            );
        return { headers, rows };
    };

    const downloadBlob = (blob: Blob, filename: string) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);
    };

    const handleExportCsv = () => {
        const { headers, rows } = buildExportData();
        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => escapeCsvValue(cell)).join(','))
            .join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        downloadBlob(blob, `${exportFileName}.csv`);
    };

    const handleExportExcel = async () => {
        const { headers, rows } = buildExportData();
        const xlsxModule = await import('xlsx');
        const xlsx = 'default' in xlsxModule ? xlsxModule.default : xlsxModule;
        const worksheet = xlsx.utils.aoa_to_sheet([headers, ...rows]);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, t('exportSheetName'));
        xlsx.writeFile(workbook, `${exportFileName}.xlsx`, { compression: true });
    };

    const toolbar = (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                {enableGlobalSearch && (
                    <Input
                        value={globalFilter}
                        onChange={event => setGlobalFilter(event.target.value)}
                        placeholder={resolvedSearchPlaceholder}
                        className="sm:max-w-xs"
                        disabled={isLoading}
                        data-testid="table-global-search"
                    />
                )}
                {enableColumnFilters && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button type="button" variant="outline" size="sm" disabled={isLoading}>
                                <Filter className="h-4 w-4" />
                                {t('filters')}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-72 p-0">
                            <DropdownMenuLabel>{t('columnFilters')}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <div className="space-y-3 p-3">
                                {orderedColumns.filter(column => column.getCanFilter()).length ===
                                    0 && (
                                    <p className="text-sm text-muted-foreground">
                                        {t('noFilterableColumns')}
                                    </p>
                                )}
                                {orderedColumns
                                    .filter(column => column.getCanFilter())
                                    .map(column => {
                                        const headerLabel = getColumnLabel(
                                            column.id,
                                            column.columnDef.header
                                        );
                                        return (
                                            <div key={column.id} className="space-y-1">
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    {headerLabel}
                                                </span>
                                                <Input
                                                    value={
                                                        (column.getFilterValue() as string) ?? ''
                                                    }
                                                    onChange={event =>
                                                        column.setFilterValue(event.target.value)
                                                    }
                                                    placeholder={t('filterColumn', {
                                                        column: headerLabel,
                                                    })}
                                                    className="h-8"
                                                    data-testid={`table-filter-${column.id}`}
                                                />
                                            </div>
                                        );
                                    })}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {enableColumnVisibility && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button type="button" variant="outline" size="sm" disabled={isLoading}>
                                <Eye className="h-4 w-4" />
                                {t('columns')}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('toggleColumns')}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {orderedColumns
                                .filter(column => {
                                    const meta = getColumnMeta(column);
                                    return (
                                        column.getCanHide() &&
                                        !(meta?.disableColumnVisibility || meta?.isAction)
                                    );
                                })
                                .map(column => {
                                    const headerLabel = getColumnLabel(
                                        column.id,
                                        column.columnDef.header
                                    );
                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={column.id}
                                            checked={column.getIsVisible()}
                                            onCheckedChange={value =>
                                                column.toggleVisibility(Boolean(value))
                                            }
                                        >
                                            {headerLabel}
                                        </DropdownMenuCheckboxItem>
                                    );
                                })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
                {enableColumnOrder && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button type="button" variant="outline" size="sm" disabled={isLoading}>
                                <ListOrdered className="h-4 w-4" />
                                {t('order')}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 p-0">
                            <DropdownMenuLabel>{t('columnOrder')}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <div className="space-y-2 p-2">
                                {orderableOrder.map((columnId, index) => {
                                    const column = orderableColumns.find(
                                        entry => entry.id === columnId
                                    );
                                    if (!column) {
                                        return null;
                                    }
                                    const headerLabel = getColumnLabel(
                                        column.id,
                                        column.columnDef.header
                                    );
                                    return (
                                        <div
                                            key={column.id}
                                            className="flex items-center justify-between gap-2"
                                        >
                                            <span className="truncate text-sm">{headerLabel}</span>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => moveColumn(column.id, 'up')}
                                                    disabled={index === 0}
                                                >
                                                    <ChevronUp className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => moveColumn(column.id, 'down')}
                                                    disabled={index === orderableOrder.length - 1}
                                                >
                                                    <ChevronDown className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start"
                                    onClick={() => setColumnOrder([])}
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    {t('resetOrder')}
                                </Button>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
                {enableExport && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isLoading}
                                data-testid="table-export-trigger"
                            >
                                <Download className="h-4 w-4" />
                                {t('export')}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" data-testid="table-export-menu">
                            <DropdownMenuLabel>{t('export')}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <button
                                type="button"
                                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                                onClick={handleExportCsv}
                                data-testid="table-export-csv"
                            >
                                {t('exportCsv')}
                            </button>
                            <button
                                type="button"
                                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                                onClick={handleExportExcel}
                                data-testid="table-export-xlsx"
                            >
                                {t('exportExcel')}
                            </button>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </div>
    );

    if (isLoading) {
        return (
            <div className="space-y-3">
                {toolbar}
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
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {toolbar}
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
                                                    {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                                    {sortState === 'asc' ? (
                                                        <ArrowUp className="h-3.5 w-3.5" />
                                                    ) : sortState === 'desc' ? (
                                                        <ArrowDown className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
                                                    )}
                                                </button>
                                            ) : (
                                                flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )
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
                                <TableCell
                                    colSpan={Math.max(1, table.getVisibleLeafColumns().length)}
                                    className="h-24 text-center"
                                >
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
