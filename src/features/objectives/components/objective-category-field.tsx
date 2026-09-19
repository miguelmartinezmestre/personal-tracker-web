'use client';
import {
    FieldShell,
    getFieldError,
    FormControl,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form-fields';
import type { TanStackFormApi } from '@/components/forms/form-types';
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
    form: TanStackFormApi;
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
    form,
    label,
    placeholder,
    loadingLabel,
    emptyLabel,
    testId,
    categoryOptions,
    categoriesLoading,
}: ObjectiveCategoryFieldProps) {
    return (
        <form.Field name="categoryId">
            {field => (
                <FieldShell name={field.name} error={getFieldError(form, field)}>
                    <FormItem>
                        <FormLabel>{label}</FormLabel>
                        <Select
                            onValueChange={value => field.handleChange(value)}
                            value={typeof field.state.value === 'string' ? field.state.value : ''}
                        >
                            <FormControl>
                                <SelectTrigger onBlur={field.handleBlur} data-testid={testId}>
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
                </FieldShell>
            )}
        </form.Field>
    );
}
