'use client';

import { z } from 'zod';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form-tanstack';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { savedCategorySchema, Category } from '@/features/categories/schemas/category';
import { getLucideIcon } from '@/lib/icons';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { categoryIconSchema } from '@/features/categories/schemas/category';
import FormModal from '@/components/form-modal';

const colorOptions = [
    { value: '#ef4444', label: 'Red' },
    { value: '#f97316', label: 'Orange' },
    { value: '#eab308', label: 'Yellow' },
    { value: '#22c55e', label: 'Green' },
    { value: '#14b8a6', label: 'Teal' },
    { value: '#3b82f6', label: 'Blue' },
    { value: '#a855f7', label: 'Purple' },
    { value: '#ec4899', label: 'Pink' },
    { value: '#6b7280', label: 'Gray' },
];

const iconOptions = categoryIconSchema.options;

const renderIcon = (iconName: string) => {
    const IconComponent = getLucideIcon(iconName);
    return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
};

export default function EditCategoryFormModal({ defaultValues }: { defaultValues: Category }) {
    const t = useTranslations('Objectives.categories');
    const tCommon = useTranslations('Common');
    const queryClient = useQueryClient();

    const updateCategory = useMutation({
        mutationFn: useConvexMutation(api.categories.updateCategory),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [api.categories.getCategoriesByUser],
            });
        },
    });

    return (
        <FormModal<z.infer<typeof savedCategorySchema>>
            trigger={
                <Button className="gap-2" data-testid="category-edit-open">
                    <PlusCircle className="h-4 w-4" />
                    {t('buttons.update')}
                </Button>
            }
            title={t('editTitle')}
            contentClassName="sm:max-w-[500px]"
            formOptions={{
                defaultValues: {
                    id: defaultValues.id,
                    name: defaultValues.name,
                    color: defaultValues.color,
                    icon: defaultValues.icon,
                },
                validators: {
                    onChange: savedCategorySchema,
                    onSubmit: savedCategorySchema,
                },
            }}
            onSubmit={async (values: Category) => {
                await updateCategory.mutateAsync({
                    id: values.id,
                    name: values.name,
                    color: values.color,
                    icon: values.icon,
                });
            }}
            submitLabel={t('buttons.update')}
            cancelLabel={t('buttons.cancel')}
            pendingLabel={t('buttons.updating')}
            isPending={updateCategory.isPending}
            cancelTestId="category-edit-cancel-button"
            submitTestId="category-edit-save-button"
        >
            {() => (
                <>
                    <FormField
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('fields.name')}</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder={t('placeholders.name')}
                                        {...field}
                                        data-testid="category-edit-name-input"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        name="color"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('fields.color')}</FormLabel>
                                <Select
                                    value={field.value as string | undefined}
                                    onValueChange={field.onChange}
                                >
                                    <FormControl>
                                        <SelectTrigger data-testid="category-edit-color-select">
                                            <SelectValue placeholder={t('fields.color')} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {colorOptions.map(option => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                                data-testid={`category-edit-color-${option.value}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="h-4 w-4 rounded border"
                                                        style={{
                                                            backgroundColor: option.value,
                                                        }}
                                                    />
                                                    {option.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        name="icon"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('fields.icon')}</FormLabel>
                                <Select
                                    value={(field.value as string | undefined) ?? 'none'}
                                    onValueChange={value =>
                                        field.onChange(value === 'none' ? undefined : value)
                                    }
                                >
                                    <FormControl>
                                        <SelectTrigger data-testid="category-edit-icon-select">
                                            <SelectValue
                                                placeholder={t('placeholders.selectIcon')}
                                            />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem
                                            value="none"
                                            data-testid="category-edit-icon-none"
                                        >
                                            {tCommon('icons.tag')}
                                        </SelectItem>
                                        {iconOptions.map(icon => (
                                            <SelectItem
                                                key={icon}
                                                value={icon}
                                                data-testid={`category-edit-icon-${icon}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {renderIcon(icon)}
                                                    {tCommon('icons.' + icon)}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </>
            )}
        </FormModal>
    );
}
