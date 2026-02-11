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
    Objective,
    savedObjectiveSchema,
    directionSchema,
    objectiveTypeSchema,
    reminderIntervalSchema,
    progressModeSchema,
} from '@/features/objectives/schemas/objective';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { useTranslations } from 'next-intl';
import type { Doc, Id } from '@/convex/_generated/dataModel';
export default function EditObjectiveFormModal({ defaultValues }: { defaultValues: Objective }) {
    const t = useTranslations('Objectives');
    const tCommon = useTranslations('Common');
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const updateObjective = useMutation({
        mutationFn: useConvexMutation(api.objectives.updateObjective),
        onSuccess: () => {
            // Invalidate all objectives queries regardless of pagination
            queryClient.invalidateQueries({
                queryKey: [api.objectives.getObjectivesByUser],
            });
        },
    });

    const categoriesQuery = useQuery({
        ...convexQuery(api.categories.getCategoriesByUser, {}),
    });

    const categoryOptions = useMemo(() => {
        const options: Array<{ id: string; value: string; label: string }> = (
            categoriesQuery.data ?? []
        ).map((category: Doc<'categories'>) => ({
            id: String(category._id),
            value: category.name,
            label: category.name,
        }));

        if (
            defaultValues.category &&
            !options.some((option: { value: string }) => option.value === defaultValues.category)
        ) {
            options.unshift({
                id: `missing-${defaultValues.category}`,
                value: defaultValues.category,
                label: defaultValues.category,
            });
        }

        return options;
    }, [categoriesQuery.data, defaultValues.category]);

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
    type Direction = z.infer<typeof directionSchema>;
    type ReminderInterval = z.infer<typeof reminderIntervalSchema>;
    type ProgressMode = z.infer<typeof progressModeSchema>;

    const defaultUnitByType: Partial<Record<ObjectiveType, string>> = {
        count: 'times',
        money: 'EUR',
        duration: 'minutes',
    };

    const progressModeOptions = [
        { value: 'cumulative', label: t('progressModeOptions.cumulative') },
        { value: 'snapshot', label: t('progressModeOptions.snapshot') },
    ];

    const initialValues = {
        ...defaultValues,
        objectiveType: defaultValues.objectiveType ?? 'value',
        direction: defaultValues.direction ?? 'increase',
        reminderInterval: defaultValues.reminderInterval ?? 'none',
        progressMode: defaultValues.progressMode ?? 'cumulative',
    };

    const form = useForm<z.infer<typeof savedObjectiveSchema>>({
        defaultValues: initialValues,
        validators: {
            onChange: savedObjectiveSchema,
            onSubmit: savedObjectiveSchema,
        },
        onSubmit: async ({ value }: { value: Objective }) => {
            await onSubmit(value);
        },
    });

    const onSubmit = async (values: Objective) => {
        const updateData = {
            id: values._id as Id<'objectives'>,
            title: values.title,
            description: values.description ?? undefined,
            category: values.category ?? undefined,
            targetValue: values.targetValue,
            currentValue: values.currentValue,
            startValue: values.startValue ?? undefined,
            deadline: values.deadline ? new Date(values.deadline).getTime() : undefined,
            unit: values.unit ?? undefined,
            objectiveType: values.objectiveType ?? undefined,
            direction: values.direction ?? undefined,
            reminderInterval: values.reminderInterval ?? undefined,
            progressMode: values.progressMode ?? undefined,
        };

        await updateObjective.mutateAsync(updateData);

        setOpen(false);
        form.reset();
    };

    const progressMode = form.state.values.progressMode ?? 'cumulative';

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2" data-testid="objective-edit-open">
                    <PlusCircle className="h-4 w-4" />
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
                                    <FormLabel>{t('category')}</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value || ''}
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
                                                <SelectTrigger>
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
                                            onValueChange={value => {
                                                const nextDirection = value as Direction;
                                                field.onChange(nextDirection);
                                            }}
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
                                        onValueChange={value => {
                                            const nextInterval = value as ReminderInterval;
                                            field.onChange(nextInterval);
                                        }}
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
                                                disabled={true}
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
                                        <FormLabel>{t('unit')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={t('enterUnit')}
                                                {...field}
                                                value={field.value || ''}
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
                                            : t('currentValue')}
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            {...field}
                                            onChange={e =>
                                                field.onChange(Number.parseFloat(e.target.value))
                                            }
                                            data-testid="objective-edit-current-input"
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
                                    <FormLabel>{t('deadline')}</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={'outline'}
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
