'use client';

import * as React from 'react';
import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { PlusCircle } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@repo/ui/components/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@repo/ui/components/form-tanstack';
import { Input } from '@repo/ui/components/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@repo/ui/components/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@repo/ui/components/select';
import { categorySchema, CreateCategory } from '@/schemas/category';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import { categoryIconSchema } from '@/schemas/category';

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

export default function CreateCategoryFormModal() {
    const t = useTranslations('Objectives.categories');
    const tCommon = useTranslations('Common');
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const createCategory = useMutation({
        mutationFn: useConvexMutation(api.categories.createCategory),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.categories.getCategoriesByUser, {}).queryKey,
            });
        },
    });
    const form = useForm<z.infer<typeof categorySchema>>({
        defaultValues: defaultValues,
        validators: {
            onChange: categorySchema,
            onSubmit: categorySchema,
        },
        onSubmit: async ({ value }: { value: CreateCategory }) => {
            await onSubmit(value);
        },
    });

    const onSubmit = async (values: CreateCategory) => {
        await createCategory.mutateAsync(values);
        setOpen(false);
        form.reset();
    };

    const renderIcon = (iconName: string) => {
        const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
        const IconComponent = icons[iconName];
        return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2" data-testid="category-create-open">
                    <PlusCircle className="h-4 w-4" />
                    {t('buttons.create')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{t('createTitle')}</DialogTitle>
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
                                                            style={{ backgroundColor: option.value }}
                                                        />
                                                        {option.label}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        {tCommon('colors.' + colorOptions.find(c => c.value === field.value)?.label.toLowerCase())}
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
                                        value={field.value ?? ''}
                                        onValueChange={value => field.onChange(value || undefined)}
                                    >
                                        <FormControl>
                                            <SelectTrigger data-testid="category-icon-select">
                                                <SelectValue placeholder={t('placeholders.selectIcon')} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="" data-testid="category-icon-none">
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

                        <DialogFooter className="pt-4">
                            <Button
                                variant="outline"
                                type="button"
                                onClick={() => setOpen(false)}
                                data-testid="category-cancel-button"
                            >
                                {t('buttons.cancel')}
                            </Button>
                            <Button type="submit" data-testid="category-save-button" disabled={createCategory.isPending}>
                                {createCategory.isPending ? t('buttons.creating') : t('buttons.create')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
