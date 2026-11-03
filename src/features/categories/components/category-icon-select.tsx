'use client';

import { useTranslations } from 'next-intl';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { categoryIconComponent } from '@/features/categories/lib/category-icons';
import { categoryIconSchema } from '@/features/categories/schemas/category';

type CategoryIcon = (typeof categoryIconSchema.options)[number];

export function CategoryIconSelect({
    id,
    value,
    onValueChange,
    ariaLabel,
    className,
    testId,
}: {
    id?: string;
    value: CategoryIcon | undefined;
    onValueChange: (icon: CategoryIcon) => void;
    ariaLabel?: string;
    className?: string;
    testId?: string;
}) {
    const t = useTranslations('Common.icons');

    const items = categoryIconSchema.options.map(icon => ({ value: icon, label: t(icon) }));

    return (
        <Select
            value={value ?? 'tag'}
            items={items}
            onValueChange={next => {
                const parsed = categoryIconSchema.safeParse(next);

                if (parsed.success) {
                    onValueChange(parsed.data);
                }
            }}
        >
            <SelectTrigger
                id={id}
                className={className}
                aria-label={ariaLabel}
                data-testid={testId}
            >
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {items.map(item => {
                    const Icon = categoryIconComponent(item.value);

                    return (
                        <SelectItem key={item.value} value={item.value}>
                            <Icon className="size-4" aria-hidden />
                            {item.label}
                        </SelectItem>
                    );
                })}
            </SelectContent>
        </Select>
    );
}
