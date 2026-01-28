'use client';

import * as React from 'react';
import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { PlusCircle } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form-tanstack';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { savedCategorySchema, Category } from '@/features/categories/schemas/category';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { categoryIconSchema } from '@/features/categories/schemas/category';

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

export default function EditCategoryFormModal({ defaultValues }: { defaultValues: Category }) {
    const t = useTranslations('Objectives.categories');
    const tCommon = useTranslations('Common');
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const updateCategory = useMutation({
        mutationFn: useConvexMutation(api.categories.updateCategory),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.categories.getCategoriesByUser, {}).queryKey,
            });
        },
    });
    const form = useForm<z.infer<typeof savedCategorySchema>>({
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
        onSubmit: async ({ value }: { value: Category }) => {
            await onSubmit(value);
        },
    });

    const onSubmit = async (values: Category) => {
        const updateData = {
            id: values.id,
            name: values.name,
            color: values.color,
            icon: values.icon,
        };

        await updateCategory.mutateAsync(updateData);

        setOpen(false);
        form.reset();
    };

    const renderIcon = (iconName: string) => {
        const icons = LucideIcons as unknown as Record<
            string,
            React.ComponentType<{ className?: string }>
        >;
        const IconComponent = icons[iconName];
        return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2" data-testid="category-edit-open">
                    <PlusCircle className="h-4 w-4" />
                    {t('buttons.update')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{t('editTitle')}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={e => {
                            e.preventDefault();
                            form.handleSubmit();
                        }}
                        className="space-y-5 py-4"
                    >
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
                                    <Select value={field.value} onValueChange={field.onChange}>
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
                                        value={field.value ?? ''}
                                        onValueChange={value => field.onChange(value || undefined)}
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
                                                value=""
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

                        <DialogFooter className="pt-4">
                            <Button
                                variant="outline"
                                type="button"
                                onClick={() => setOpen(false)}
                                data-testid="category-edit-cancel-button"
                            >
                                {t('buttons.cancel')}
                            </Button>
                            <Button
                                type="submit"
                                data-testid="category-edit-save-button"
                                disabled={updateCategory.isPending}
                            >
                                {updateCategory.isPending
                                    ? t('buttons.updating')
                                    : t('buttons.update')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
