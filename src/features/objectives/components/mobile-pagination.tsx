import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { useServerPagination } from '@/features/table/hooks/use-server-pagination';

export function MobilePagination({
    pagination,
    totalPages,
}: {
    pagination: ReturnType<typeof useServerPagination>;
    totalPages: number;
}) {
    if (!pagination.hasPreviousPage && !pagination.hasNextPage) return null;
    return (
        <div className="flex items-center justify-center gap-2 pt-2">
            <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.goToPage(pagination.currentPage - 1)}
                disabled={!pagination.hasPreviousPage}
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
                {pagination.currentPage + 1} / {totalPages}
            </span>
            <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.goToPage(pagination.currentPage + 1)}
                disabled={!pagination.hasNextPage}
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    );
}
