'use client';

import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { TanStackFormApi } from '@/components/forms/form-types';
import { getFieldErrors } from '@/components/forms/form-utils';
import { todayDateInput } from '@/features/objectives/lib/dates';
import { PROGRESS_COMMENT_MAX_LENGTH } from '@/convex/features/objectives/constants';
import { type ProgressFormValues } from '@/features/objectives/schemas/objective';
import { useTranslations } from 'next-intl';

/** The value, date and comment fields shared by the new-progress form and the edit dialog. */
export function ProgressFields({
    form,
    idPrefix,
    testIdPrefix,
    valueLabel,
    valueHint,
    commentPlaceholder,
}: {
    form: TanStackFormApi<ProgressFormValues>;
    idPrefix: string;
    testIdPrefix: string;
    valueLabel: string;
    valueHint: string;
    commentPlaceholder?: string;
}) {
    const t = useTranslations('UpdateProgress');

    return (
        <FieldGroup>
            <form.Field name="updatedValue">
                {field => {
                    const errors = getFieldErrors(form, field);
                    const isInvalid = errors.length > 0;
                    const value = Number.isFinite(field.state.value) ? field.state.value : '';

                    return (
                        <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={`${idPrefix}${field.name}`}>
                                {valueLabel}
                            </FieldLabel>
                            <Input
                                id={`${idPrefix}${field.name}`}
                                name={field.name}
                                type="number"
                                step="any"
                                min={0}
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
                            <p className="text-muted-foreground text-sm">{valueHint}</p>
                            {isInvalid ? <FieldError errors={errors} /> : null}
                        </Field>
                    );
                }}
            </form.Field>
            <form.Field name="updateDate">
                {field => {
                    const errors = getFieldErrors(form, field);
                    const isInvalid = errors.length > 0;

                    return (
                        <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={`${idPrefix}${field.name}`}>
                                {t('table.columns.date')}
                            </FieldLabel>
                            <Input
                                id={`${idPrefix}${field.name}`}
                                name={field.name}
                                type="date"
                                max={todayDateInput()}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={event => field.handleChange(event.target.value)}
                                aria-invalid={isInvalid}
                                data-testid={`${testIdPrefix}-date-input`}
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
                                maxLength={PROGRESS_COMMENT_MAX_LENGTH}
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
