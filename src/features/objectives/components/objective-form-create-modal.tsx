'use client';

import { useMemo, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { CalendarIcon, PlusCircle } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/ui-utils/utils';
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
    CreateObjective,
    objectiveSchema,
    objectiveTypeSchema,
    periodSchema,
    progressModeSchema,
} from '@/features/objectives/schemas/objective';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { useTranslations } from 'next-intl';
import { Doc } from '@/convex/_generated/dataModel';

const defaultValues: CreateObjective = {
    title: '',
    description: '',
    category: null,
    targetValue: 0,
    currentValue: 0,
    startValue: null,
    deadline: null,
    status: 'active', // Objectives auto-activate on creation
    unit: '',
    objectiveType: 'value',
    direction: 'increase',
    period: 'none',
    periodStart: null,
    periodLengthDays: null,
    reminderInterval: 'none',
    progressMode: 'cumulative',
};

export default function CreateObjectiveFormModal() {
    const t = useTranslations('Objectives');
    const tCommon = useTranslations('Common');
    const queryClient = useQueryClient();

    const createObjective = useMutation({
        mutationFn: useConvexMutation(api.objectives.createObjective),
        onSuccess: () => {
            // Invalidate all objectives queries regardless of pagination
            queryClient.invalidateQueries({
                queryKey: [api.objectives.getObjectivesByUser],
            });
        },
    });

    // Status is auto-set to 'active' by the workflow system, no selection needed

    const objectiveTypeOptions = [
        { value: 'value', label: t('objectiveTypeOptions.value') },
        { value: 'count', label: t('objectiveTypeOptions.count') },
        { value: 'money', label: t('objectiveTypeOptions.money') },
        { value: 'duration', label: t('objectiveTypeOptions.duration') },
    ];

    const directionOptions = [
        { value: 'increase', label: t('directionOptions.increase') },
        { value: 'decrease', label: t('directionOptions.decrease') },
    ];

    const reminderIntervalOptions = [
        { value: 'none', label: t('reminderIntervalOptions.none') },
        { value: 'monthly', label: t('reminderIntervalOptions.monthly') },
        { value: 'biweekly', label: t('reminderIntervalOptions.biweekly') },
    ];

    type ObjectiveType = z.infer<typeof objectiveTypeSchema>;
    type ProgressMode = z.infer<typeof progressModeSchema>;
    type Period = z.infer<typeof periodSchema>;

    const defaultUnitByType: Partial<Record<ObjectiveType, string>> = {
        count: 'times',
        money: 'EUR',
        duration: 'minutes',
    };

    const progressModeOptions = [
        { value: 'cumulative', label: t('progressModeOptions.cumulative') },
        { value: 'snapshot', label: t('progressModeOptions.snapshot') },
    ];

    const periodOptions = [
        { value: 'none', label: t('periodOptions.none') },
        { value: 'weekly', label: t('periodOptions.weekly') },
        { value: 'monthly', label: t('periodOptions.monthly') },
        { value: 'custom', label: t('periodOptions.custom') },
    ];

    const categoriesQuery = useQuery({
        ...convexQuery(api.categories.getCategoriesByUser, {}),
    });

    const categoryOptions = useMemo(
        (): Array<{ id: string; value: string; label: string }> =>
            (categoriesQuery.data ?? []).map((category: Doc<'categories'>) => ({
                id: String(category._id),
                value: category.name,
                label: category.name,
            })),
        [categoriesQuery.data]
    );

    const [open, setOpen] = useState(false);

    const form = useForm<z.infer<typeof objectiveSchema>>({
        defaultValues: defaultValues,
        validators: {
            onChange: objectiveSchema,
            onSubmit: objectiveSchema,
        },
        onSubmit: async ({ value }: { value: CreateObjective }) => {
            await onSubmit(value);
        },
    });

    const onSubmit = async (values: CreateObjective) => {
        await createObjective.mutateAsync({
            title: values.title,
            description: values.description ?? undefined,
            category: values.category ?? undefined,
            targetValue: values.targetValue,
            currentValue: values.currentValue,
            startValue: values.startValue ?? values.currentValue,
            deadline: values.deadline ? new Date(values.deadline).getTime() : undefined,
            // Status is auto-set to 'active' by the workflow system
            unit: values.unit ?? undefined,
            objectiveType: values.objectiveType ?? undefined,
            direction: values.direction ?? undefined,
            period: values.period ?? undefined,
            periodStart: values.period && values.period !== 'none' ? Date.now() : undefined,
            periodLengthDays: values.periodLengthDays ?? undefined,
            reminderInterval: values.reminderInterval ?? undefined,
            progressMode: values.progressMode ?? undefined,
        });
        setOpen(false);
        form.reset();
    };

    const progressMode = form.state.values.progressMode ?? 'cumulative';
    const selectedPeriod = form.state.values.period ?? 'none';

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2" data-testid="objective-create-open">
                    <PlusCircle className="h-4 w-4" />
                    {t('createObjective')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('createObjective')}</DialogTitle>
                    <DialogDescription>{t('createObjectiveDescription')}</DialogDescription>
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
                                            value={field.value || ''}
                                            data-testid="objective-description-input"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        {t('optionalAddDetailsAboutYourObjective')}
                                    </FormDescription>
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
                                        value={field.value || ''}
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
                                                        key={category.id ?? category.value}
                                                        value={category.value}
                                                    >
                                                        {category.label}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        {t('optionalCategorizeYourObjective')}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                name="objectiveType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('smartForm.fields.objectiveType')}</FormLabel>
                                        <Select
                                            onValueChange={value => {
                                                const nextType = value as ObjectiveType;
                                                field.onChange(value);
                                                if (
                                                    !form.state.values.unit &&
                                                    defaultUnitByType[nextType]
                                                ) {
                                                    form.setFieldValue(
                                                        'unit',
                                                        defaultUnitByType[nextType]
                                                    );
                                                }
                                            }}
                                            value={field.value || 'value'}
                                        >
                                            <FormControl>
                                                <SelectTrigger data-testid="objective-type-select">
                                                    <SelectValue
                                                        placeholder={t(
                                                            'smartForm.placeholders.objectiveType'
                                                        )}
                                                    />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {objectiveTypeOptions.map(option => (
                                                    <SelectItem
                                                        key={option.value}
                                                        value={option.value}
                                                    >
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            {t('objectiveTypeDescription')}
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                name="direction"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('smartForm.fields.direction')}</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value || 'increase'}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue
                                                        placeholder={t(
                                                            'smartForm.placeholders.direction'
                                                        )}
                                                    />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {directionOptions.map(option => (
                                                    <SelectItem
                                                        key={option.value}
                                                        value={option.value}
                                                    >
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            {t('directionDescription')}
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            name="progressMode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('progressMode')}</FormLabel>
                                    <Select
                                        onValueChange={value =>
                                            field.onChange(value as ProgressMode)
                                        }
                                        value={field.value || 'cumulative'}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('progressMode')} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {progressModeOptions.map(option => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        {t('progressModeDescription')}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            name="reminderInterval"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('reminderInterval')}</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value || 'none'}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue
                                                    placeholder={t(
                                                        'smartForm.placeholders.reminderInterval'
                                                    )}
                                                />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {reminderIntervalOptions.map(option => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        {t('reminderIntervalDescription')}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            name="period"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('period')}</FormLabel>
                                    <Select
                                        onValueChange={value => {
                                            field.onChange(value as Period);
                                            // Auto-set periodLengthDays for known periods
                                            if (value === 'weekly') {
                                                form.setFieldValue('periodLengthDays', 7);
                                            } else if (value === 'monthly') {
                                                form.setFieldValue('periodLengthDays', 30);
                                            } else if (value === 'none') {
                                                form.setFieldValue('periodLengthDays', null);
                                            }
                                        }}
                                        value={field.value || 'none'}
                                    >
                                        <FormControl>
                                            <SelectTrigger data-testid="objective-period-select">
                                                <SelectValue placeholder={t('period')} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {periodOptions.map(option => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>{t('periodDescription')}</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {selectedPeriod === 'custom' && (
                            <FormField
                                name="periodLengthDays"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('periodLengthDays')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min={1}
                                                {...field}
                                                value={field.value ?? ''}
                                                onChange={e =>
                                                    field.onChange(
                                                        e.target.value
                                                            ? Number.parseInt(e.target.value, 10)
                                                            : null
                                                    )
                                                }
                                                data-testid="objective-period-length-input"
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            {t('periodLengthDaysDescription')}
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

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
                                                    field.onChange(
                                                        Number.parseFloat(e.target.value)
                                                    )
                                                }
                                                data-testid="objective-target-input"
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            {t('theGoalYouWantToAchieve')}
                                        </FormDescription>
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
                                                value={field.value || ''}
                                                data-testid="objective-unit-input"
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            {t('optionalUnitOfMeasurement')}
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            name="currentValue"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        {progressMode === 'cumulative'
                                            ? t('initialValue')
                                            : t('smartForm.fields.currentValue')}
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            {...field}
                                            onChange={e =>
                                                field.onChange(Number.parseFloat(e.target.value))
                                            }
                                            data-testid="objective-current-input"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        {progressMode === 'cumulative'
                                            ? t('initialValueDescription')
                                            : t('yourCurrentProgress')}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            name="deadline"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>{t('smartForm.fields.deadline')}</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={'outline'}
                                                    className={cn(
                                                        'w-full pl-3 text-left font-normal',
                                                        !field.value && 'text-muted-foreground'
                                                    )}
                                                    data-testid="objective-deadline-button"
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
                                                onSelect={field.onChange}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormDescription>
                                        {t('optionalWhenDoYouWantToAchieveThisObjective')}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Status is auto-set to 'active' by the workflow system */}

                        <DialogFooter className="pt-4">
                            <Button
                                variant="outline"
                                type="button"
                                onClick={() => setOpen(false)}
                                data-testid="objective-cancel-button"
                            >
                                {t('cancel')}
                            </Button>
                            <Button type="submit" data-testid="objective-save-button">
                                {t('saveObjective')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
