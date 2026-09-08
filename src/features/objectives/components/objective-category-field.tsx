'use client';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form-tanstack';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    CATEGORY_EMPTY_VALUE,
    CATEGORY_LOADING_VALUE,
    type CategoryOption,
} from '@/features/objectives/lib/objective-category-selection';
type ObjectiveCategoryFieldProps = {
    label: string;
    placeholder: string;
    loadingLabel: string;
    emptyLabel: string;
    testId: string;
    categoryOptions: CategoryOption[];
    categoriesLoading: boolean;
};
function CategorySelectItems({
    categoriesLoading,
    categoryOptions,
    loadingLabel,
    emptyLabel,
}: Pick<
    ObjectiveCategoryFieldProps,
    'categoriesLoading' | 'categoryOptions' | 'loadingLabel' | 'emptyLabel'
>) {
    if (categoriesLoading) {
        return (
            <SelectItem value={CATEGORY_LOADING_VALUE} disabled>
                {loadingLabel}
            </SelectItem>
        );
    }
    if (categoryOptions.length === 0) {
        return (
            <SelectItem value={CATEGORY_EMPTY_VALUE} disabled>
                {emptyLabel}
            </SelectItem>
        );
    }
    return (
        <>
            {categoryOptions.map(category => (
                <SelectItem key={category.id} value={category.id}>
                    {category.label}
                </SelectItem>
            ))}
        </>
    );
}
export function ObjectiveCategoryField({
    label,
    placeholder,
    loadingLabel,
    emptyLabel,
    testId,
    categoryOptions,
    categoriesLoading,
}: ObjectiveCategoryFieldProps) {
    return (
        <FormField
            name="categoryId"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <Select
                        onValueChange={field.onChange}
                        value={typeof field.value === 'string' ? field.value : ''}
                    >
                        <FormControl>
                            <SelectTrigger data-testid={testId}>
                                <SelectValue placeholder={placeholder} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <CategorySelectItems
                                categoriesLoading={categoriesLoading}
                                categoryOptions={categoryOptions}
                                loadingLabel={loadingLabel}
                                emptyLabel={emptyLabel}
                            />
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}
