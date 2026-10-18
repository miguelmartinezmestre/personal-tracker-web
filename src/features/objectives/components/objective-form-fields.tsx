'use client';

import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { TanStackFormApi } from '@/components/forms/form-types';
import { getFieldErrors } from '@/components/forms/form-utils';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePaginatedList } from '@/components/data-table/hooks/use-paginated-list';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useCategoryLabel } from '@/features/categories/hooks/use-category-label';
import {
    OBJECTIVE_DESCRIPTION_MAX_LENGTH,
    OBJECTIVE_TITLE_MAX_LENGTH,
    OBJECTIVE_UNIT_MAX_LENGTH,
} from '@/convex/features/objectives/constants';
import { todayDateInput } from '@/features/objectives/lib/dates';
import { NONE_CATEGORY, type ObjectiveFormValues } from '@/features/objectives/schemas/objective';
import { useTranslations } from 'next-intl';

export function ObjectiveFormFields({
    form,
    keptDeadline = '',
    currentCategory,
}: {
    form: TanStackFormApi<ObjectiveFormValues>;
    keptDeadline?: string;
    // The objective's own category, which may not be on the pages loaded so far.
    currentCategory?: { id: Id<'categories'>; name: string };
}) {
    const t = useTranslations('Objectives');
    const common = useTranslations('Common');
    // The picker offers today onwards, or the deadline an overdue objective already keeps.
    const today = todayDateInput();
    const minDeadline = keptDeadline && keptDeadline < today ? keptDeadline : today;
    const categories = usePaginatedList(api.categories.listCategories, {});
    const categoryLabel = useCategoryLabel();

    const loaded = categories.data.map(category => ({ id: category.id, name: category.name }));

    if (currentCategory && !loaded.some(category => category.id === currentCategory.id)) {
        loaded.push(currentCategory);
    }

    const categoryOptions = [
        { value: NONE_CATEGORY, label: t('noCategory') },
        ...loaded.map(category => ({ value: category.id, label: categoryLabel(category.name) })),
    ];

    return (
        <FieldGroup>
            <TitleField form={form} />
            <form.Field name="description">
                {field => {
                    const errors = getFieldErrors(form, field);
                    const isInvalid = errors.length > 0;

                    return (
                        <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>{t('tableDescription')}</FieldLabel>
                            <Textarea
                                id={field.name}
                                name={field.name}
                                value={field.state.value}
                                placeholder={t('describeObjectiveInDetail')}
                                maxLength={OBJECTIVE_DESCRIPTION_MAX_LENGTH}
                                onBlur={field.handleBlur}
                                onChange={event => field.handleChange(event.target.value)}
                                aria-invalid={isInvalid}
                                data-testid="objective-description-input"
                            />
                            {isInvalid ? <FieldError errors={errors} /> : null}
                        </Field>
                    );
                }}
            </form.Field>
            <form.Field name="categoryId">
                {field => {
                    const errors = getFieldErrors(form, field);
                    const isInvalid = errors.length > 0;

                    return (
                        <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>{t('category')}</FieldLabel>
                            <Select
                                name={field.name}
                                value={field.state.value}
                                items={categoryOptions}
                                onValueChange={next => {
                                    if (next !== null) {
                                        field.handleChange(next);
                                    }
                                }}
                            >
                                <SelectTrigger
                                    id={field.name}
                                    onBlur={field.handleBlur}
                                    aria-invalid={isInvalid}
                                    data-testid="objective-category-select"
                                >
                                    <SelectValue placeholder={t('selectACategory')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {categoryOptions.map(option => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="w-full"
                                        disabled={!categories.canLoadMore || categories.isFetching}
                                        onClick={categories.loadMore}
                                        data-testid="objective-category-load-more"
                                    >
                                        {categories.isFetching && (
                                            <Loader2 className="animate-spin" aria-hidden />
                                        )}
                                        {common('actions.loadMore')}
                                    </Button>
                                </SelectContent>
                            </Select>
                            {isInvalid ? <FieldError errors={errors} /> : null}
                        </Field>
                    );
                }}
            </form.Field>
            <form.Field name="unit">
                {field => {
                    const errors = getFieldErrors(form, field);
                    const isInvalid = errors.length > 0;

                    return (
                        <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>{t('unit')}</FieldLabel>
                            <Input
                                id={field.name}
                                name={field.name}
                                value={field.state.value}
                                placeholder={t('unitExample')}
                                maxLength={OBJECTIVE_UNIT_MAX_LENGTH}
                                onBlur={field.handleBlur}
                                onChange={event => field.handleChange(event.target.value)}
                                aria-invalid={isInvalid}
                                data-testid="objective-unit-input"
                            />
                            {isInvalid ? <FieldError errors={errors} /> : null}
                        </Field>
                    );
                }}
            </form.Field>
            <NumberField
                form={form}
                name="startValue"
                label={t('initialValue')}
                testId="objective-start-input"
            />
            <NumberField
                form={form}
                name="targetValue"
                label={t('smartForm.fields.targetValueRequired')}
                testId="objective-target-input"
            />
            <form.Field name="deadline">
                {field => {
                    const errors = getFieldErrors(form, field);
                    const isInvalid = errors.length > 0;

                    return (
                        <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>{t('deadline')}</FieldLabel>
                            <Input
                                id={field.name}
                                name={field.name}
                                type="date"
                                min={minDeadline}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={event => field.handleChange(event.target.value)}
                                aria-invalid={isInvalid}
                                data-testid="objective-deadline-input"
                            />
                            {isInvalid ? <FieldError errors={errors} /> : null}
                        </Field>
                    );
                }}
            </form.Field>
        </FieldGroup>
    );
}

function NumberField({
    form,
    name,
    label,
    testId,
}: {
    form: TanStackFormApi<ObjectiveFormValues>;
    name: 'startValue' | 'targetValue';
    label: string;
    testId: string;
}) {
    return (
        <form.Field name={name}>
            {field => {
                const errors = getFieldErrors(form, field);
                const isInvalid = errors.length > 0;
                // An emptied input is stored as NaN so the schema reports it as required.
                const value = Number.isFinite(field.state.value) ? field.state.value : '';

                const handleChange = (rawValue: string) => {
                    let nextValue: number;

                    if (rawValue === '') {
                        nextValue = Number.NaN;
                    } else {
                        nextValue = Number(rawValue);
                    }

                    field.handleChange(nextValue);
                };

                return (
                    <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
                        <Input
                            id={field.name}
                            name={field.name}
                            type="number"
                            step="any"
                            min={0}
                            value={value}
                            onBlur={field.handleBlur}
                            onChange={event => handleChange(event.target.value)}
                            aria-invalid={isInvalid}
                            data-testid={testId}
                        />
                        {isInvalid ? <FieldError errors={errors} /> : null}
                    </Field>
                );
            }}
        </form.Field>
    );
}

function TitleField({ form }: { form: TanStackFormApi<ObjectiveFormValues> }) {
    const t = useTranslations('Objectives');

    return (
        <form.Field name="title">
            {field => {
                const errors = getFieldErrors(form, field);
                const isInvalid = errors.length > 0;
                const title = field.state.value;

                return (
                    <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                            {t('smartForm.fields.titleRequired')}
                        </FieldLabel>
                        <Input
                            id={field.name}
                            name={field.name}
                            value={title}
                            placeholder={t('enterObjectiveTitle')}
                            maxLength={OBJECTIVE_TITLE_MAX_LENGTH}
                            aria-describedby={`${field.name}-count`}
                            onBlur={field.handleBlur}
                            onChange={event => field.handleChange(event.target.value)}
                            aria-invalid={isInvalid}
                            data-testid="objective-title-input"
                        />
                        <div className="flex justify-between gap-4">
                            <FieldDescription>
                                {t('giveYourObjectiveAClearConciseTitle')}
                            </FieldDescription>
                            {/* The input stops at the limit, so show how close it is. */}
                            <span
                                id={`${field.name}-count`}
                                className="text-muted-foreground shrink-0 text-xs tabular-nums"
                                data-testid="objective-title-count"
                            >
                                {t('characterCount', {
                                    count: title.length,
                                    max: OBJECTIVE_TITLE_MAX_LENGTH,
                                })}
                            </span>
                        </div>
                        {isInvalid ? <FieldError errors={errors} /> : null}
                    </Field>
                );
            }}
        </form.Field>
    );
}
