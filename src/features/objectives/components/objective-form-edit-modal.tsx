'use client';

import { useMemo } from 'react';
import { CalendarIcon, Pencil } from 'lucide-react';
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
import { Objective, savedObjectiveSchema } from '@/features/objectives/schemas/objective';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/convex/_generated/api';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { useTranslations } from 'next-intl';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import FormModal from '@/components/form-modal';

export default function EditObjectiveFormModal({ defaultValues }: { defaultValues: Objective }) {
    const t = useTranslations('Objectives');
    const tCommon = useTranslations('Common');
    const queryClient = useQueryClient();

    const updateObjectiveMutation = useMutation({
        mutationFn: useConvexMutation(api.objectives.updateObjective),
        onSuccess: () => {
            queryClient.refetchQueries({
                queryKey: ['convex', { api: api.objectives.getObjectivesByUser }],
            });
            queryClient.refetchQueries({
                queryKey: ['convex', { api: api.objectives.getOrganizationObjectives }],
            });
            queryClient.refetchQueries({
                queryKey: ['convex', { api: api.objectives.getObjectiveById }],
            });
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
            category: defaultValues.categoryId
                ? String(defaultValues.categoryId)
                : defaultValues.category
                  ? (categoryNameToId.get(defaultValues.category) ?? defaultValues.category)
                  : null,
        }),
        [defaultValues, categoryNameToId]
    );

    return (
        <FormModal<Objective>
            trigger={
                <Button className="gap-2" data-testid="objective-edit-open">
                    <Pencil className="h-4 w-4" />
                    {t('editObjective')}
                </Button>
            }
            title={t('editObjective')}
            description={t('editObjectiveDescription')}
            formOptions={{
                defaultValues: initialValues,
                validators: {
                    onChange: savedObjectiveSchema,
                    onSubmit: savedObjectiveSchema,
                },
            }}
            onSubmit={async (value: Objective) => {
                const raw = value.category;

                const base = {
                    id: value._id as Id<'objectives'>,
                    title: value.title,
                    description: value.description ?? undefined,
                    targetValue: value.targetValue,
                    deadline: value.deadline ?? undefined,
                    unit: value.unit ?? undefined,
                    scope: value.scope,
                };

                if (!raw || raw === 'loading' || raw === 'empty') {
                    await updateObjectiveMutation.mutateAsync({
                        ...base,
                        category: '',
                    });
                } else if (raw.startsWith('missing-')) {
                    await updateObjectiveMutation.mutateAsync({
                        ...base,
                        category: categoryIdToName.get(raw) ?? '',
                    });
                } else {
                    await updateObjectiveMutation.mutateAsync({
                        ...base,
                        categoryId: raw as Id<'categories'>,
                    });
                }
            }}
            submitLabel={t('saveObjective')}
            cancelLabel={t('cancel')}
            isPending={updateObjectiveMutation.isPending}
            pendingLabel={tCommon('loading')}
            submitTestId="objective-edit-save-button"
        >
            {() => (
                <>
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
                                        value={(field.value as string) || ''}
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
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value as string | undefined}
                                    >
                                        <FormControl>
                                            <SelectTrigger data-testid="objective-edit-scope-select">
                                                <SelectValue placeholder={t('scope')} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem
                                                value="personal"
                                                data-testid="objective-edit-scope-personal"
                                            >
                                                {t('scopeOptions.personal')}
                                            </SelectItem>
                                            <SelectItem
                                                value="organization"
                                                data-testid="objective-edit-scope-organization"
                                            >
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
                                        value={(field.value as string) || ''}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('selectACategory')} />
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
                                                field.onChange(Number.parseFloat(e.target.value))
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
                                            value={(field.value as string) || ''}
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
                                                    new Date(
                                                        field.value as number
                                                    ).toLocaleDateString()
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
                                                field.value
                                                    ? new Date(field.value as number)
                                                    : undefined
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
                </>
            )}
        </FormModal>
    );
}
