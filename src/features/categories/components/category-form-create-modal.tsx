'use client';

import * as React from 'react';
import { z } from 'zod';
import { PlusCircle } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    FormControl,
    FormDescription,
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
import { categorySchema, CreateCategory } from '@/features/categories/schemas/category';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { categoryIconSchema } from '@/features/categories/schemas/category';
import FormModal from '@/components/form-modal';

const defaultValues: CreateCategory = {
    name: '',
    color: '#3b82f6',
    icon: undefined,
};

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
    const icons = LucideIcons as unknown as Record<
        string,
        React.ComponentType<{ className?: string }>
    >;
    const IconComponent = icons[iconName];
    return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
};

export default function CreateCategoryFormModal() {
    const t = useTranslations('Objectives.categories');
    const tCommon = useTranslations('Common');
    const queryClient = useQueryClient();

    const createCategory = useMutation({
        mutationFn: useConvexMutation(api.categories.createCategory),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [api.categories.getCategoriesByUser],
            });
        },
    });

    return (
        <FormModal<z.infer<typeof categorySchema>>
            trigger={
                <Button className="gap-2" data-testid="category-create-open">
                    <PlusCircle className="h-4 w-4" />
                    {t('buttons.create')}
                </Button>
            }
            title={t('createTitle')}
            contentClassName="sm:max-w-[500px]"
            formOptions={{
                defaultValues,
                validators: {
                    onChange: categorySchema,
                    onSubmit: categorySchema,
                },
            }}
            onSubmit={async (values: CreateCategory) => {
                await createCategory.mutateAsync(values);
            }}
            submitLabel={t('buttons.create')}
            cancelLabel={t('buttons.cancel')}
            pendingLabel={t('buttons.creating')}
            isPending={createCategory.isPending}
            cancelTestId="category-cancel-button"
            submitTestId="category-save-button"
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
                                        data-testid="category-name-input"
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
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <FormControl>
                                        <SelectTrigger data-testid="category-color-select">
                                            <SelectValue placeholder={t('fields.color')} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {colorOptions.map(option => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                                data-testid={`category-color-${option.value}`}
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
                                <FormDescription>
                                    {tCommon(
                                        'colors.' +
                                            colorOptions
                                                .find(c => c.value === field.value)
                                                ?.label.toLowerCase()
                                    )}
                                </FormDescription>
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
                                    value={field.value ?? 'none'}
                                    onValueChange={value =>
                                        field.onChange(value === 'none' ? undefined : value)
                                    }
                                >
                                    <FormControl>
                                        <SelectTrigger data-testid="category-icon-select">
                                            <SelectValue
                                                placeholder={t('placeholders.selectIcon')}
                                            />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="none" data-testid="category-icon-none">
                                            {tCommon('icons.tag')}
                                        </SelectItem>
                                        {iconOptions.map(icon => (
                                            <SelectItem
                                                key={icon}
                                                value={icon}
                                                data-testid={`category-icon-${icon}`}
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
