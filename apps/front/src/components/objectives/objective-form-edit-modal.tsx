'use client';

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { CalendarIcon, PlusCircle } from 'lucide-react';
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
import { Textarea } from '@repo/ui/components/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/popover';
import { Calendar } from '@repo/ui/components/calendar';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@repo/ui/components/select';
import { cn } from '@repo/ui/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@repo/ui/components/dialog';
import { Objective, savedObjectiveSchema } from '@/schemas/objective';
import { useUpdateObjective } from '@/hooks/api/use-objectives';
import { useTranslations } from 'next-intl';
const statusOptions = [
    { value: 'not_started', label: 'Not Started' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
];

const categoryOptions = [
    { value: 'personal', label: 'Personal' },
    { value: 'work', label: 'Work' },
    { value: 'health', label: 'Health' },
    { value: 'finance', label: 'Finance' },
    { value: 'education', label: 'Education' },
];

export default function EditObjectiveFormModal({ defaultValues }: { defaultValues: Objective }) {
    const t = useTranslations('Objectives');
    const updateObjective = useUpdateObjective();
    const [open, setOpen] = useState(false);

    const objectiveTypeOptions = [
        { value: 'value', label: t('objectiveTypeOptions.value') },
        { value: 'count', label: t('objectiveTypeOptions.count') },
        { value: 'money', label: t('objectiveTypeOptions.money') },
        { value: 'duration', label: t('objectiveTypeOptions.duration') },
    ];

    const periodOptions = [
        { value: 'none', label: t('periodOptions.none') },
        { value: 'weekly', label: t('periodOptions.weekly') },
        { value: 'monthly', label: t('periodOptions.monthly') },
        { value: 'custom', label: t('periodOptions.custom') },
    ];

    const defaultUnitByType: Record<string, string> = {
        count: 'times',
        money: 'EUR',
        duration: 'minutes',
    };

    const defaultPeriodByType: Record<string, string> = {
        count: 'weekly',
        money: 'monthly',
        duration: 'weekly',
    };

    const initialValues = {
        ...defaultValues,
        objectiveType: defaultValues.objectiveType ?? 'value',
        period: defaultValues.period ?? 'none',
        periodStart: defaultValues.periodStart ?? null,
        periodLengthDays: defaultValues.periodLengthDays ?? null,
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
            id: values._id,
            title: values.title,
            description: values.description ?? undefined,
            category: values.category ?? undefined,
            targetValue: values.targetValue,
            currentValue: values.currentValue,
            deadline: values.deadline ? new Date(values.deadline).getTime() : undefined,
            status: values.status ?? undefined,
            unit: values.unit ?? undefined,
            objectiveType: values.objectiveType ?? undefined,
            period: values.period ?? undefined,
            periodStart: values.periodStart ?? undefined,
            periodLengthDays: values.periodLengthDays ?? undefined,
        };

        await updateObjective.mutateAsync(updateData);

        setOpen(false);
        form.reset();
    };

    const objectiveType = form.state.values.objectiveType ?? 'value';
    const period = form.state.values.period ?? 'none';

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
                                            {categoryOptions.map(category => (
                                                <SelectItem
                                                    key={category.value}
                                                    value={category.value}
                                                >
                                                    {category.label}
                                                </SelectItem>
                                            ))}
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
                                                field.onChange(value);
                                                if (value === 'value') {
                                                    form.setFieldValue('period', 'none');
                                                    form.setFieldValue('periodStart', null);
                                                    form.setFieldValue('periodLengthDays', null);
                                                } else if (
                                                    !form.state.values.period ||
                                                    form.state.values.period === 'none'
                                                ) {
                                                    form.setFieldValue(
                                                        'period',
                                                        defaultPeriodByType[value] ?? 'weekly'
                                                    );
                                                }
                                                if (
                                                    !form.state.values.unit &&
                                                    defaultUnitByType[value]
                                                ) {
                                                    form.setFieldValue(
                                                        'unit',
                                                        defaultUnitByType[value]
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
                                name="period"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('smartForm.fields.period')}</FormLabel>
                                        <Select
                                            onValueChange={value => {
                                                field.onChange(value);
                                                if (value !== 'custom') {
                                                    form.setFieldValue('periodStart', null);
                                                    form.setFieldValue('periodLengthDays', null);
                                                } else {
                                                    if (!form.state.values.periodStart) {
                                                        form.setFieldValue(
                                                            'periodStart',
                                                            Date.now()
                                                        );
                                                    }
                                                    if (!form.state.values.periodLengthDays) {
                                                        form.setFieldValue('periodLengthDays', 7);
                                                    }
                                                }
                                            }}
                                            value={field.value || 'none'}
                                            disabled={objectiveType === 'value'}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue
                                                        placeholder={t(
                                                            'smartForm.placeholders.period'
                                                        )}
                                                    />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {periodOptions.map(option => (
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
                                            {t('periodDescription')}
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {objectiveType !== 'value' && period === 'custom' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    name="periodStart"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>{t('periodStart')}</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={'outline'}
                                                            className={cn(
                                                                'w-full pl-3 text-left font-normal',
                                                                !field.value &&
                                                                    'text-muted-foreground'
                                                            )}
                                                        >
                                                            {field.value ? (
                                                                new Date(
                                                                    field.value
                                                                ).toLocaleDateString()
                                                            ) : (
                                                                <span>
                                                                    {t('pickADate')}
                                                                </span>
                                                            )}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent
                                                    className="w-auto p-0"
                                                    align="start"
                                                >
                                                    <Calendar
                                                        mode="single"
                                                        selected={
                                                            field.value
                                                                ? new Date(field.value)
                                                                : undefined
                                                        }
                                                        onSelect={date =>
                                                            field.onChange(
                                                                date?.getTime() || null
                                                            )
                                                        }
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormDescription>
                                                {t('periodStartDescription')}
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

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
                                                    onChange={e =>
                                                        field.onChange(
                                                            e.target.value === ''
                                                                ? null
                                                                : Number.parseInt(e.target.value, 10)
                                                        )
                                                    }
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                {t('periodLengthDaysDescription')}
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

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

                        {objectiveType === 'value' && (
                            <FormField
                                name="currentValue"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('currentValue')}</FormLabel>
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
                                            {t('yourCurrentProgress')}
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

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

                        <FormField
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('status')}</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value || 'not_started'}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('selectStatus')} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {statusOptions.map(status => (
                                                <SelectItem key={status.value} value={status.value}>
                                                    {status.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        {t('currentStatusOfYourObjective')}
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
