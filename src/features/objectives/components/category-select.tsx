'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { usePaginatedList } from '@/components/data-table/hooks/use-paginated-list';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

export function CategorySelect({
    id,
    value,
    onValueChange,
    onBlur,
    firstOption,
    currentCategory,
    placeholder,
    isInvalid = false,
    ariaLabel,
    testId,
}: {
    id: string;
    value: string;
    onValueChange: (value: string) => void;
    onBlur?: () => void;
    firstOption: { value: string; label: string };
    currentCategory?: { id: Id<'categories'>; name: string };
    placeholder?: string;
    isInvalid?: boolean;
    ariaLabel?: string;
    testId: string;
}) {
    const common = useTranslations('Common');
    const categories = usePaginatedList(api.categories.listCategories, {});

    const loaded = categories.data.map(category => ({ id: category.id, name: category.name }));

    if (currentCategory && !loaded.some(category => category.id === currentCategory.id)) {
        loaded.push(currentCategory);
    }

    const options = [
        firstOption,
        ...loaded.map(category => ({ value: category.id, label: category.name })),
    ];

    return (
        <Select
            value={value}
            items={options}
            onValueChange={next => {
                if (next !== null) {
                    onValueChange(next);
                }
            }}
        >
            <SelectTrigger
                id={id}
                onBlur={onBlur}
                aria-invalid={isInvalid}
                aria-label={ariaLabel}
                data-testid={testId}
            >
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {options.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    disabled={!categories.canLoadMore || categories.isFetching}
                    onClick={categories.loadMore}
                    data-testid={`${testId}-load-more`}
                >
                    {categories.isFetching && <Loader2 className="animate-spin" aria-hidden />}
                    {common('actions.loadMore')}
                </Button>
            </SelectContent>
        </Select>
    );
}
