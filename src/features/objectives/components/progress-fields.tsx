'use client';

import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import type { TanStackFormApi } from '@/components/forms/form-types';
import { getFieldErrors } from '@/components/forms/form-utils';
import { DateField } from '@/features/objectives/components/date-field';
import { todayDateInput } from '@/features/objectives/lib/dates';
import { formatObjectiveValue } from '@/features/objectives/lib/format';
import { progressDifference, roundValue } from '@/features/objectives/lib/progress';
import { type ProgressFormValues } from '@/features/objectives/schemas/objective';
import { useLocale, useTranslations } from 'next-intl';

const MODES = ['difference', 'value'] as const;

/**
 * The entry fields shared by the new-progress form and the edit dialog. Each entry is typed as a
 * difference (+3, −1.2) or as the new value (88), which is stored as its difference from
 * `baseValue` (decision 11).
 */
export function ProgressFields({
    form,
    idPrefix,
    testIdPrefix,
    baseValue,
    unit,
    commentPlaceholder,
}: {
    form: TanStackFormApi<ProgressFormValues>;
    idPrefix: string;
    testIdPrefix: string;
    baseValue: number;
    unit?: string | undefined;
    commentPlaceholder?: string;
}) {
    const t = useTranslations('UpdateProgress');
    const locale = useLocale();
    const today = todayDateInput();

    return (
        <FieldGroup>
            <form.Field name="mode">
                {field => (
                    <Field>
                        <FieldLabel id={`${idPrefix}mode-label`}>{t('mode.label')}</FieldLabel>
                        <RadioGroup
                            value={field.state.value}
                            onValueChange={value => {
                                if (value !== 'difference' && value !== 'value') {
                                    return;
                                }

                                // The typed amount keeps its meaning in the other form.
                                const amount = form.getFieldValue('amount');

                                if (Number.isFinite(amount)) {
                                    form.setFieldValue(
                                        'amount',
                                        value === 'value'
                                            ? roundValue(baseValue + amount)
                                            : progressDifference('value', amount, baseValue)
                                    );
                                }

                                field.handleChange(value);
                            }}
                            aria-labelledby={`${idPrefix}mode-label`}
                            className="flex flex-wrap gap-4"
                        >
                            {MODES.map(mode => (
                                <div key={mode} className="flex items-center gap-2">
                                    <RadioGroupItem
                                        value={mode}
                                        id={`${idPrefix}mode-${mode}`}
                                        data-testid={`${testIdPrefix}-mode-${mode}`}
                                    />
                                    <Label htmlFor={`${idPrefix}mode-${mode}`}>
                                        {t(`mode.${mode}`)}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </Field>
                )}
            </form.Field>
            <form.Subscribe selector={state => state.values.mode}>
                {mode => (
                    <form.Field name="amount">
                        {field => {
                            const errors = getFieldErrors(form, field);
                            const isInvalid = errors.length > 0;

                            const value = Number.isFinite(field.state.value)
                                ? field.state.value
                                : '';

                            const label = t(`mode.${mode}Amount`);

                            return (
                                <Field data-invalid={isInvalid}>
                                    <FieldLabel htmlFor={`${idPrefix}${field.name}`}>
                                        {unit ? `${label} (${unit})` : label}
                                    </FieldLabel>
                                    <Input
                                        id={`${idPrefix}${field.name}`}
                                        name={field.name}
                                        type="number"
                                        step="any"
                                        value={value}
                                        onBlur={field.handleBlur}
                                        // An empty input is NaN so the schema reports it as required.
                                        onChange={event =>
                                            field.handleChange(
                                                event.target.value === ''
                                                    ? Number.NaN
                                                    : Number(event.target.value)
                                            )
                                        }
                                        aria-invalid={isInvalid}
                                        data-testid={`${testIdPrefix}-value-input`}
                                    />
                                    <FieldDescription>
                                        {t(`mode.${mode}Hint`, {
                                            value: formatObjectiveValue(baseValue, locale),
                                        })}
                                    </FieldDescription>
                                    {isInvalid ? <FieldError errors={errors} /> : null}
                                </Field>
                            );
                        }}
                    </form.Field>
                )}
            </form.Subscribe>
            <form.Field name="updateDate">
                {field => {
                    const errors = getFieldErrors(form, field);
                    const isInvalid = errors.length > 0;

                    return (
                        <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={`${idPrefix}${field.name}`}>
                                {t('table.columns.date')}
                            </FieldLabel>
                            <DateField
                                id={`${idPrefix}${field.name}`}
                                value={field.state.value}
                                onChange={field.handleChange}
                                onBlur={field.handleBlur}
                                max={today}
                                required
                                isInvalid={isInvalid}
                                testId={`${testIdPrefix}-date-input`}
                            />
                            {isInvalid ? <FieldError errors={errors} /> : null}
                        </Field>
                    );
                }}
            </form.Field>
            <form.Field name="comment">
                {field => {
                    const errors = getFieldErrors(form, field);
                    const isInvalid = errors.length > 0;

                    return (
                        <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={`${idPrefix}${field.name}`}>
                                {t('comment')}
                            </FieldLabel>
                            <Textarea
                                id={`${idPrefix}${field.name}`}
                                name={field.name}
                                value={field.state.value}
                                placeholder={commentPlaceholder}
                                onBlur={field.handleBlur}
                                onChange={event => field.handleChange(event.target.value)}
                                aria-invalid={isInvalid}
                                data-testid={`${testIdPrefix}-comment-input`}
                            />
                            {isInvalid ? <FieldError errors={errors} /> : null}
                        </Field>
                    );
                }}
            </form.Field>
        </FieldGroup>
    );
}
