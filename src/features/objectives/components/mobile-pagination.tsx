import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { useServerPagination } from '@/features/table/hooks/use-server-pagination';

export function MobilePagination({
    pagination,
    rowCount,
    hasNextPage,
    isLoading,
    onNextPage,
}: {
    pagination: ReturnType<typeof useServerPagination>;
    rowCount: number;
    hasNextPage: boolean;
    isLoading: boolean;
    onNextPage: () => void;
}) {
    const t = useTranslations('Table');

    if (!pagination.hasPreviousPage && !hasNextPage) return null;
    return (
        <div className="flex items-center justify-center gap-2 pt-2">
            <Button
                variant="outline"
                size="sm"
                onClick={pagination.previousPage}
                disabled={!pagination.hasPreviousPage || isLoading}
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
                {t('showing')} {rowCount} {t('rows')}
            </span>
            <Button
                variant="outline"
                size="sm"
                onClick={onNextPage}
                disabled={!hasNextPage || isLoading}
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    );
}
