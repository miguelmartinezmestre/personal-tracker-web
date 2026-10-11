import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DataTablePaginationProps {
    onNextPage: () => void;
    onPreviousPage: () => void;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    rowCount: number;
    isLoading?: boolean;
}

export function DataTablePagination({
    onNextPage,
    onPreviousPage,
    hasNextPage,
    hasPreviousPage,
    rowCount,
    isLoading = false,
}: DataTablePaginationProps) {
    const t = useTranslations('Table');

    if (rowCount === 0 && !hasPreviousPage && !hasNextPage) {
        return null;
    }

    return (
        <div className="flex items-center justify-between gap-2 px-2">
            <div className="text-sm text-muted-foreground">
                {t('showingRows', { count: rowCount })}
            </div>
            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onPreviousPage}
                    disabled={!hasPreviousPage || isLoading}
                    className="h-8 gap-2"
                >
                    <ChevronLeft className="h-4 w-4" />
                    <span>{t('previous')}</span>
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onNextPage}
                    disabled={!hasNextPage || isLoading}
                    className="h-8 gap-2"
                >
                    <span>{t('next')}</span>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
