'use client';

import { useMemo, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { CalendarIcon, Pencil } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/ui-utils/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Objective, savedObjectiveSchema } from '@/features/objectives/schemas/objective';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/convex/_generated/api';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { useTranslations } from 'next-intl';
import type { Doc, Id } from '@/convex/_generated/dataModel';

export default function EditObjectiveFormModal({ defaultValues }: { defaultValues: Objective }) {
    const t = useTranslations('Objectives');
    const tCommon = useTranslations('Common');
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();

    const updateObjectiveMutation = useMutation({
        mutationFn: useConvexMutation(api.objectives.updateObjective),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.objectives.getObjectivesByUser] });
            queryClient.invalidateQueries({ queryKey: [api.objectives.getOrganizationObjectives] });
            queryClient.invalidateQueries({ queryKey: [api.objectives.getObjectiveById] });
        },
    });

    const categoriesQuery = useQuery({
        ...convexQuery(api.categories.getCategoriesByUser, {
            paginationOpts: { numItems: 100, cursor: null },
        }),
    });

    const categoryOptions = useMemo(() => {
        const options: Array<{ id: string; label: string }> = (
            categoriesQuery.data?.page ?? []
        ).map((category: Doc<'categories'>) => ({
            id: category._id,
            label: category.name,
        }));

        if (
            defaultValues.category &&
            !options.some(option => option.label === defaultValues.category)
        ) {
            options.unshift({
                id: `missing-${defaultValues.category}`,
                label: defaultValues.category,
            });
        }

        return options;
    }, [categoriesQuery.data, defaultValues.category]);

    const categoryIdToName = useMemo(
        () => new Map(categoryOptions.map(c => [c.id, c.label])),
        [categoryOptions]
    );

    const categoryNameToId = useMemo(
        () => new Map(categoryOptions.map(c => [c.label, c.id])),
        [categoryOptions]
    );

    const initialValues = useMemo(
        () => ({
            ...defaultValues,
            category: defaultValues.category
                ? (categoryNameToId.get(defaultValues.category) ?? defaultValues.category)
                : null,
        }),
        [defaultValues, categoryNameToId]
    );

    const form = useForm<Objective>({
        defaultValues: initialValues,
        validators: {
            onChange: savedObjectiveSchema,
            onSubmit: savedObjectiveSchema,
        },
        onSubmit: async ({ value }) => {
            const categoryName = value.category
                ? (categoryIdToName.get(value.category) ?? value.category)
                : undefined;
            await updateObjectiveMutation.mutateAsync({
                id: value._id as Id<'objectives'>,
                title: value.title,
                description: value.description ?? undefined,
                category: categoryName,
                targetValue: value.targetValue,
                deadline: value.deadline ?? undefined,
                unit: value.unit ?? undefined,
                scope: value.scope,
            });

            setOpen(false);
            form.reset();
        },
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2" data-testid="objective-edit-open">
                    <Pencil className="h-4 w-4" />
                    {t('editObjective')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('editObjective')}</DialogTitle>
                    <DialogDescription>{t('editObjectiveDescription')}</DialogDescription>
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
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('title')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t('enterObjectiveTitle')}
                                            {...field}
                                            data-testid="objective-edit-title-input"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        {t('giveYourObjectiveAClearConciseTitle')}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('description')}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder={t('describeObjectiveInDetail')}
                                            className="resize-none min-h-[80px]"
                                            {...field}
                                            value={field.value || ''}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                name="scope"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('scope')}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger data-testid="objective-edit-scope-select">
                                                    <SelectValue placeholder={t('scope')} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="personal">
                                                    {t('scopeOptions.personal')}
                                                </SelectItem>
                                                <SelectItem value="organization">
                                                    {t('scopeOptions.organization')}
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('category')}</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value || ''}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue
                                                        placeholder={t('selectACategory')}
                                                    />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {categoriesQuery.isLoading ? (
                                                    <SelectItem value="loading" disabled>
                                                        {tCommon('loading')}
                                                    </SelectItem>
                                                ) : categoryOptions.length === 0 ? (
                                                    <SelectItem value="empty" disabled>
                                                        {t('categories.emptyTitle')}
                                                    </SelectItem>
                                                ) : (
                                                    categoryOptions.map(category => (
                                                        <SelectItem
                                                            key={category.id}
                                                            value={category.id}
                                                        >
                                                            {category.label}
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                name="targetValue"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('targetValue')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                onChange={e =>
                                                    field.onChange(
                                                        Number.parseFloat(e.target.value)
                                                    )
                                                }
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                name="unit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('unit')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={t('enterUnit')}
                                                {...field}
                                                value={field.value || ''}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            name="deadline"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>{t('deadline')}</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        'w-full pl-3 text-left font-normal',
                                                        !field.value && 'text-muted-foreground'
                                                    )}
                                                >
                                                    {field.value ? (
                                                        new Date(field.value).toLocaleDateString()
                                                    ) : (
                                                        <span>{t('pickADate')}</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={
                                                    field.value ? new Date(field.value) : undefined
                                                }
                                                onSelect={value =>
                                                    field.onChange(value ? value.getTime() : null)
                                                }
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
                            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                                {t('cancel')}
                            </Button>
                            <Button type="submit" data-testid="objective-edit-save-button">
                                {t('saveObjective')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
