import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface DataTablePaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    pageSize?: number;
    totalItems?: number;
}

export function DataTablePagination({
    currentPage,
    totalPages,
    onPageChange,
    hasNextPage,
    hasPreviousPage,
    pageSize = 10,
    totalItems,
}: DataTablePaginationProps) {
    const t = useTranslations('Table');

    // Don't show pagination if there's only one page and we know there's no more data
    if (totalPages <= 1 && !hasNextPage) {
        return null;
    }

    // Generate page numbers to show (simple version showing current and nearby)
    const getPageNumbers = () => {
        const pages: (number | 'ellipsis')[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 0; i < totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(0);

            if (currentPage <= 2) {
                for (let i = 1; i <= 3; i++) {
                    pages.push(i);
                }
                pages.push('ellipsis');
                pages.push(totalPages - 1);
            } else if (currentPage >= totalPages - 3) {
                pages.push('ellipsis');
                for (let i = totalPages - 4; i < totalPages; i++) {
                    pages.push(i);
                }
            } else {
                pages.push('ellipsis');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pages.push(i);
                }
                pages.push('ellipsis');
                pages.push(totalPages - 1);
            }
        }

        return pages;
    };

    const pageNumbers = getPageNumbers();

    // Calculate showing info
    const startItem = currentPage * pageSize + 1;
    const endItem = totalItems
        ? Math.min((currentPage + 1) * pageSize, totalItems)
        : (currentPage + 1) * pageSize;

    return (
        <div className="flex items-center justify-between px-2">
            <div className="text-sm text-muted-foreground">
                {totalItems ? (
                    <>
                        {t('showing')} {startItem}-{endItem} {t('ofTotal')} {totalItems} {t('rows')}
                    </>
                ) : (
                    <>
                        {t('page')} {currentPage + 1} {t('of')} {totalPages}
                    </>
                )}
            </div>
            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(0)}
                    disabled={!hasPreviousPage}
                    className="h-8 w-8 p-0"
                >
                    <ChevronsLeft className="h-4 w-4" />
                    <span className="sr-only">{t('first')}</span>
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={!hasPreviousPage}
                    className="h-8 w-8 p-0"
                >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">{t('previous')}</span>
                </Button>
                {pageNumbers.map((page, index) =>
                    page === 'ellipsis' ? (
                        <div
                            key={`ellipsis-${index}`}
                            className="flex h-8 w-8 items-center justify-center text-sm text-muted-foreground"
                        >
                            ...
                        </div>
                    ) : (
                        <Button
                            key={page}
                            variant={currentPage === page ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => onPageChange(page)}
                            className="h-8 w-8 p-0"
                        >
                            {page + 1}
                        </Button>
                    )
                )}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={!hasNextPage}
                    className="h-8 w-8 p-0"
                >
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">{t('next')}</span>
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(totalPages - 1)}
                    disabled={!hasNextPage}
                    className="h-8 w-8 p-0"
                >
                    <ChevronsRight className="h-4 w-4" />
                    <span className="sr-only">{t('last')}</span>
                </Button>
            </div>
        </div>
    );
}
