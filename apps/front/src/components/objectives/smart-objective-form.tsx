'use client';

import * as React from 'react';
import { useForm } from '@tanstack/react-form';
import type { CreateObjective } from '@/schemas/objective';
import { useCreateObjective, useUpdateObjective } from '@/hooks/api/use-objectives';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Textarea } from '@repo/ui/components/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@repo/ui/components/select';
import { Calendar } from '@repo/ui/components/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@repo/ui/lib/utils';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Id } from '@repo/backend/convex/_generated/dataModel';

interface SmartObjectiveFormProps {
    defaultValues?: Partial<CreateObjective>;
    onSubmit?: (values: CreateObjective) => void;
    onCancel?: () => void;
    mode?: 'create' | 'edit';
    objectiveId?: Id<'objectives'>;
}

const CATEGORIES = [
    { value: 'Health & Fitness', labelKey: 'smartForm.categories.healthFitness' },
    { value: 'Career & Business', labelKey: 'smartForm.categories.careerBusiness' },
    { value: 'Learning & Education', labelKey: 'smartForm.categories.learningEducation' },
    { value: 'Personal Development', labelKey: 'smartForm.categories.personalDevelopment' },
    { value: 'Finance & Savings', labelKey: 'smartForm.categories.financeSavings' },
    { value: 'Relationships', labelKey: 'smartForm.categories.relationships' },
    { value: 'Creative Projects', labelKey: 'smartForm.categories.creativeProjects' },
    { value: 'Home & Organization', labelKey: 'smartForm.categories.homeOrganization' },
    { value: 'Travel & Adventure', labelKey: 'smartForm.categories.travelAdventure' },
    { value: 'Other', labelKey: 'smartForm.categories.other' },
];

const UNITS = [
    { value: 'kg', labelKey: 'smartForm.units.kg' },
    { value: 'lbs', labelKey: 'smartForm.units.lbs' },
    { value: 'km', labelKey: 'smartForm.units.km' },
    { value: 'miles', labelKey: 'smartForm.units.miles' },
    { value: 'hours', labelKey: 'smartForm.units.hours' },
    { value: 'minutes', labelKey: 'smartForm.units.minutes' },
    { value: 'days', labelKey: 'smartForm.units.days' },
    { value: 'weeks', labelKey: 'smartForm.units.weeks' },
    { value: '$', labelKey: 'smartForm.units.dollars' },
    { value: '€', labelKey: 'smartForm.units.euros' },
    { value: '£', labelKey: 'smartForm.units.gbp' },
    { value: 'pages', labelKey: 'smartForm.units.pages' },
    { value: 'words', labelKey: 'smartForm.units.words' },
    { value: 'count', labelKey: 'smartForm.units.count' },
    { value: '%', labelKey: 'smartForm.units.percentage' },
];

const SmartObjectiveForm = React.forwardRef<HTMLFormElement, SmartObjectiveFormProps>(
    ({ defaultValues, onSubmit, onCancel, mode = 'create', objectiveId }, ref) => {
        const t = useTranslations('Objectives');
        const tCommon = useTranslations('Common');

        const createObjectiveMutation = useCreateObjective();
        const updateObjectiveMutation = useUpdateObjective();

        const form = useForm<CreateObjective>({
            defaultValues: {
                title: defaultValues?.title || '',
                description: defaultValues?.description || '',
                category: defaultValues?.category || '',
                targetValue: defaultValues?.targetValue || 0,
                currentValue: defaultValues?.currentValue || 0,
                deadline: defaultValues?.deadline || null,
                status: defaultValues?.status || 'in_progress',
                unit: defaultValues?.unit || '',
            },
            onSubmit: async ({ value }) => {
                if (mode === 'create') {
                    createObjectiveMutation.mutate({
                        ...value,
                        status: value.status || 'in_progress',
                    }, {
                        onSuccess: () => {
                            toast.success(t('toast.createSuccess'));
                            onSubmit?.(value);
                        },
                        onError: (error: Error) => {
                            toast.error(t('toast.createFailed'));
                            console.error(error);
                        },
                    });
                } else if (mode === 'edit' && objectiveId) {
                    updateObjectiveMutation.mutate(
                        { id: objectiveId, ...value },
                        {
                            onSuccess: () => {
                                toast.success(t('toast.updateSuccess'));
                                onSubmit?.(value);
                            },
                            onError: (error: Error) => {
                                toast.error(t('toast.updateFailed'));
                                console.error(error);
                            },
                        }
                    );
                }
            },
        });

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            form.handleSubmit();
        };

        const isLoading = createObjectiveMutation.isPending || updateObjectiveMutation.isPending;

        return (
            <form ref={ref} onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <form.Field name="title">
                    {field => (
                        <div className="space-y-2">
                            <label htmlFor={field.name} className="text-sm font-medium">
                                {t('smartForm.fields.titleRequired')}
                            </label>
                            <Input
                                id={field.name}
                                value={field.state.value}
                                onChange={e => field.handleChange(e.target.value)}
                                placeholder={t('smartForm.placeholders.title')}
                                className={cn(
                                    field.state.meta.errors.length > 0 && 'border-destructive'
                                )}
                            />
                            {field.state.meta.errors.length > 0 && (
                                <p className="text-sm text-destructive">
                                    {field.state.meta.errors[0]}
                                </p>
                            )}
                        </div>
                    )}
                </form.Field>

                {/* Description */}
                <form.Field name="description">
                    {field => (
                        <div className="space-y-2">
                            <label htmlFor={field.name} className="text-sm font-medium">
                                {t('smartForm.fields.description')}
                            </label>
                            <Textarea
                                id={field.name}
                                value={field.state.value || ''}
                                onChange={e => field.handleChange(e.target.value)}
                                placeholder={t('smartForm.placeholders.description')}
                                rows={3}
                            />
                        </div>
                    )}
                </form.Field>

                {/* Category and Unit */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <form.Field name="category">
                        {field => (
                            <div className="space-y-2">
                                <label htmlFor={field.name} className="text-sm font-medium">
                                    {t('smartForm.fields.category')}
                                </label>
                                <Select
                                    value={field.state.value || ''}
                                    onValueChange={value => field.handleChange(value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue
                                            placeholder={t('smartForm.placeholders.category')}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map(category => (
                                            <SelectItem key={category.value} value={category.value}>
                                                {t(category.labelKey)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </form.Field>

                    <form.Field name="unit">
                        {field => (
                            <div className="space-y-2">
                                <label htmlFor={field.name} className="text-sm font-medium">
                                    {t('smartForm.fields.unit')}
                                </label>
                                <Select
                                    value={field.state.value || ''}
                                    onValueChange={value => field.handleChange(value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue
                                            placeholder={t('smartForm.placeholders.unit')}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {UNITS.map(unit => (
                                            <SelectItem key={unit.value} value={unit.value}>
                                                {t(unit.labelKey)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </form.Field>
                </div>

                {/* Target and Current Value */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <form.Field name="targetValue">
                        {field => (
                            <div className="space-y-2">
                                <label htmlFor={field.name} className="text-sm font-medium">
                                    {t('smartForm.fields.targetValueRequired')}
                                </label>
                                <Input
                                    id={field.name}
                                    type="number"
                                    value={field.state.value}
                                    onChange={e => field.handleChange(Number(e.target.value))}
                                    placeholder={t('smartForm.placeholders.targetValue')}
                                    className={cn(
                                        field.state.meta.errors.length > 0 && 'border-destructive'
                                    )}
                                />
                                {field.state.meta.errors.length > 0 && (
                                    <p className="text-sm text-destructive">
                                        {field.state.meta.errors[0]}
                                    </p>
                                )}
                            </div>
                        )}
                    </form.Field>

                    <form.Field name="currentValue">
                        {field => (
                            <div className="space-y-2">
                                <label htmlFor={field.name} className="text-sm font-medium">
                                    {t('smartForm.fields.currentValue')}
                                </label>
                                <Input
                                    id={field.name}
                                    type="number"
                                    value={field.state.value}
                                    onChange={e => field.handleChange(Number(e.target.value))}
                                    placeholder={t('smartForm.placeholders.currentValue')}
                                />
                            </div>
                        )}
                    </form.Field>
                </div>

                {/* Deadline */}
                <form.Field name="deadline">
                    {field => (
                        <div className="space-y-2">
                            <label htmlFor={field.name} className="text-sm font-medium">
                                {t('smartForm.fields.deadline')}
                            </label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            'w-full justify-start text-left font-normal',
                                            !field.state.value && 'text-muted-foreground'
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.state.value
                                            ? format(new Date(field.state.value), 'PPP')
                                            : t('smartForm.placeholders.pickDate')}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={
                                            field.state.value
                                                ? new Date(field.state.value)
                                                : undefined
                                        }
                                        onSelect={date =>
                                            field.handleChange(date?.getTime() || null)
                                        }
                                        defaultMonth={new Date()}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}
                </form.Field>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-2 pt-4">
                    {onCancel && (
                        <Button type="button" variant="outline" onClick={onCancel}>
                            {tCommon('actions.cancel')}
                        </Button>
                    )}
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {mode === 'create'
                            ? t('smartForm.buttons.create')
                            : t('smartForm.buttons.update')}
                    </Button>
                </div>
            </form>
        );
    }
);
SmartObjectiveForm.displayName = 'SmartObjectiveForm';

export { SmartObjectiveForm };
