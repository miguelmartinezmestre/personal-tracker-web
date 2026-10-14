import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PaginatedList } from '../hooks/use-paginated-list';

interface LoadMorePaginationProps {
    pagination: PaginatedList;
    rowCount: number;
}

export function LoadMorePagination({ pagination, rowCount }: LoadMorePaginationProps) {
    const t = useTranslations('Table');
    const common = useTranslations('Common');

    if (rowCount === 0) {
        return null;
    }

    return (
        <div className="flex flex-col items-center gap-2 pt-1">
            <p className="text-sm text-muted-foreground" aria-live="polite">
                {t('showingRows', { count: rowCount })}
            </p>
            <Button
                variant="outline"
                disabled={!pagination.canLoadMore || pagination.isFetching}
                aria-busy={pagination.isFetching}
                onClick={pagination.loadMore}
                data-testid="load-more"
            >
                {pagination.isFetching && <Loader2 className="animate-spin" aria-hidden />}
                {common('actions.loadMore')}
            </Button>
        </div>
    );
}
