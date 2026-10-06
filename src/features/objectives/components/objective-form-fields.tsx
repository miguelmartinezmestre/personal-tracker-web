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
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { NONE_CATEGORY, type ObjectiveFormValues } from '@/features/objectives/schemas/objective';
import { useTranslations } from 'next-intl';

export function ObjectiveFormFields({ form }: { form: TanStackFormApi<ObjectiveFormValues> }) {
    const t = useTranslations('Objectives');
    const categories = useQuery(convexQuery(api.categories.listCategories, {}));
    const categoryOptions = [
        { value: NONE_CATEGORY, label: t('noCategory') },
        ...(categories.data ?? []).map(category => ({ value: category.id, label: category.name })),
    ];

    return (
        <FieldGroup>
            <form.Field name="title">
                {field => {
                    const errors = getFieldErrors(form, field);
                    const isInvalid = errors.length > 0;
                    return (
                        <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>
                                {t('smartForm.fields.titleRequired')}
                            </FieldLabel>
                            <Input
                                id={field.name}
                                name={field.name}
                                value={
                                    typeof field.state.value === 'string' ? field.state.value : ''
                                }
                                placeholder={t('enterObjectiveTitle')}
                                onBlur={field.handleBlur}
                                onChange={event => field.handleChange(event.target.value)}
                                aria-invalid={isInvalid}
                                data-testid="objective-title-input"
                            />
                            <FieldDescription>
                                {t('giveYourObjectiveAClearConciseTitle')}
                            </FieldDescription>
                            {isInvalid ? <FieldError errors={errors} /> : null}
                        </Field>
                    );
                }}
            </form.Field>
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
                                value={
                                    typeof field.state.value === 'string' ? field.state.value : ''
                                }
                                placeholder={t('describeObjectiveInDetail')}
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
                    const value =
                        typeof field.state.value === 'string' ? field.state.value : NONE_CATEGORY;
                    return (
                        <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>{t('category')}</FieldLabel>
                            <Select
                                name={field.name}
                                value={value}
                                items={categoryOptions}
                                onValueChange={next => {
                                    if (typeof next === 'string') {
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
                                value={
                                    typeof field.state.value === 'string' ? field.state.value : ''
                                }
                                placeholder={t('unitExample')}
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
                label={t('targetValue')}
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
                                value={
                                    typeof field.state.value === 'string' ? field.state.value : ''
                                }
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
                let value: number | '' = '';
                if (typeof field.state.value === 'number' && Number.isFinite(field.state.value)) {
                    value = field.state.value;
                } else {
                    value = '';
                }
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
