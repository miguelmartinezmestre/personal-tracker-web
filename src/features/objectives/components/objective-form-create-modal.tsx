'use client';

import { CalendarIcon, PlusCircle } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import {
    CreateObjective,
    createObjectiveFormSchema,
} from '@/features/objectives/schemas/objective';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/convex/_generated/api';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { useTranslations } from 'next-intl';
import { Doc, Id } from '@/convex/_generated/dataModel';
import FormModal from '@/components/forms/form-modal';

const defaultValues: CreateObjective = {
    title: '',
    description: '',
    category: null,
    targetValue: 100,
    currentValue: 0,
    startValue: 0,
    deadline: null,
    status: 'active',
    scope: 'personal',
    unit: '',
};

export default function CreateObjectiveFormModal() {
    const t = useTranslations('Objectives');
    const tCommon = useTranslations('Common');
    const queryClient = useQueryClient();

    const createObjectiveMutation = useMutation({
        mutationFn: useConvexMutation(api.objectives.createObjective),
        onSuccess: () => {
            queryClient.refetchQueries({
                queryKey: ['convex', { api: api.objectives.getObjectivesByUser }],
            });
            queryClient.refetchQueries({
                queryKey: ['convex', { api: api.objectives.getOrganizationObjectives }],
            });
        },
    });

    const categoriesQuery = useQuery({
        ...convexQuery(api.categories.getCategoriesByUser, {
            paginationOpts: { numItems: 100, cursor: null },
        }),
    });

    const categoryOptions = (categoriesQuery.data?.page ?? []).map(
        (category: Doc<'categories'>) => ({
            id: category._id,
            label: category.name,
        })
    );

    return (
        <FormModal<CreateObjective>
            trigger={
                <Button className="gap-2" data-testid="objective-create-open">
                    <PlusCircle className="h-4 w-4" />
                    {t('createObjective')}
                </Button>
            }
            title={t('createObjective')}
            description={t('createObjectiveDescription')}
            formOptions={{
                defaultValues,
                validators: {
                    onChange: createObjectiveFormSchema,
                    onSubmit: createObjectiveFormSchema,
                },
            }}
            onSubmit={async (value: CreateObjective) => {
                const categoryFieldValue = value.category;
                const categoryId =
                    categoryFieldValue &&
                    categoryFieldValue !== 'loading' &&
                    categoryFieldValue !== 'empty' &&
                    !categoryFieldValue.startsWith('missing-')
                        ? (categoryFieldValue as Id<'categories'>)
                        : undefined;

                await createObjectiveMutation.mutateAsync({
                    title: value.title,
                    description: value.description ?? undefined,
                    categoryId,
                    targetValue: Number(value.targetValue),
                    startValue: 0,
                    currentValue: 0,
                    deadline: value.deadline ?? undefined,
                    scope: value.scope,
                    unit: value.unit ?? undefined,
                });
            }}
            submitLabel={t('saveObjective')}
            cancelLabel={t('cancel')}
            isPending={createObjectiveMutation.isPending}
            pendingLabel={tCommon('loading')}
            cancelTestId="objective-cancel-button"
            submitTestId="objective-save-button"
        >
            {() => (
                <>
                    <FormField
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('smartForm.fields.titleRequired')}</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder={t('enterObjectiveTitle')}
                                        {...field}
                                        data-testid="objective-title-input"
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
                                <FormLabel>{t('smartForm.fields.description')}</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder={t('describeObjectiveInDetail')}
                                        className="resize-none min-h-[80px]"
                                        {...field}
                                        value={(field.value as string) || ''}
                                        data-testid="objective-description-input"
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
                                            <SelectTrigger data-testid="objective-scope-select">
                                                <SelectValue placeholder={t('scope')} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem
                                                value="personal"
                                                data-testid="objective-scope-personal"
                                            >
                                                {t('scopeOptions.personal')}
                                            </SelectItem>
                                            <SelectItem
                                                value="organization"
                                                data-testid="objective-scope-organization"
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
                                    <FormLabel>{t('smartForm.fields.category')}</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={(field.value as string) || ''}
                                    >
                                        <FormControl>
                                            <SelectTrigger data-testid="objective-category-select">
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
                                    <FormLabel>
                                        {t('smartForm.fields.targetValueRequired')}
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            {...field}
                                            onChange={e =>
                                                field.onChange(Number.parseFloat(e.target.value))
                                            }
                                            data-testid="objective-target-input"
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
                                    <FormLabel>{t('smartForm.fields.unit')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t('unitExample')}
                                            {...field}
                                            value={(field.value as string) || ''}
                                            data-testid="objective-unit-input"
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
                                <FormLabel>{t('smartForm.fields.deadline')}</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    'w-full pl-3 text-left font-normal',
                                                    !field.value && 'text-muted-foreground'
                                                )}
                                                data-testid="objective-deadline-button"
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
