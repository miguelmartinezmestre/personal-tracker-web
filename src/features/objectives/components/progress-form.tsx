'use client';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { getFieldErrors } from '@/components/forms/form-utils';
import type { Id } from '@/convex/_generated/dataModel';
import { dateInputToUtcTimestamp, todayDateInput } from '@/features/objectives/lib/dates';
import {
    progressFormSchema,
    type ProgressFormValues,
} from '@/features/objectives/schemas/objective';
import { useTranslations } from 'next-intl';

export default function ProgressForm({ objectiveId }: { objectiveId: string }) {
    const t = useTranslations('UpdateProgress');
    const tCommon = useTranslations('Common');
    const createProgress = useMutation({
        mutationFn: useConvexMutation(api.objectives.createProgress),
    });
    const form = useForm({
        defaultValues: {
            updatedValue: 1,
            updateDate: todayDateInput(),
            comment: '',
        } satisfies ProgressFormValues,
        validators: {
            onChange: progressFormSchema,
            onSubmit: progressFormSchema,
        },
        onSubmit: async ({ value, formApi }) => {
            const updateDate = dateInputToUtcTimestamp(value.updateDate);
            if (updateDate === undefined) {
                return;
            }
            const comment = value.comment.trim();
            await createProgress.mutateAsync({
                objectiveId: objectiveId as Id<'objectives'>,
                updatedValue: value.updatedValue,
                updateDate,
                ...(comment ? { comment } : {}),
            });
            toast.success(t('toast.created'));
            formApi.reset();
        },
    });

    return (
        <form
            className="space-y-4"
            data-testid="progress-form"
            onSubmit={event => {
                event.preventDefault();
                void form.handleSubmit();
            }}
        >
            <FieldGroup>
                <form.Field name="updatedValue">
                    {field => {
                        const errors = getFieldErrors(form, field);
                        const isInvalid = errors.length > 0;
                        let value: number | '' = '';
                        if (
                            typeof field.state.value === 'number' &&
                            Number.isFinite(field.state.value)
                        ) {
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
                                <FieldLabel htmlFor={field.name}>{t('updatedValue')}</FieldLabel>
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
                                    data-testid="progress-value-input"
                                />
                                <p className="text-muted-foreground text-sm">
                                    {t('deltaDescription')}
                                </p>
                                {isInvalid ? <FieldError errors={errors} /> : null}
                            </Field>
                        );
                    }}
                </form.Field>
                <form.Field name="updateDate">
                    {field => {
                        const errors = getFieldErrors(form, field);
                        const isInvalid = errors.length > 0;
                        let value: string;
                        if (typeof field.state.value === 'string') {
                            value = field.state.value;
                        } else {
                            value = '';
                        }
                        return (
                            <Field data-invalid={isInvalid}>
                                <FieldLabel htmlFor={field.name}>
                                    {t('table.columns.date')}
                                </FieldLabel>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    type="date"
                                    max={todayDateInput()}
                                    value={value}
                                    onBlur={field.handleBlur}
                                    onChange={event => field.handleChange(event.target.value)}
                                    aria-invalid={isInvalid}
                                    data-testid="progress-date-input"
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
                        let value: string;
                        if (typeof field.state.value === 'string') {
                            value = field.state.value;
                        } else {
                            value = '';
                        }
                        return (
                            <Field data-invalid={isInvalid}>
                                <FieldLabel htmlFor={field.name}>{t('comment')}</FieldLabel>
                                <Textarea
                                    id={field.name}
                                    name={field.name}
                                    value={value}
                                    placeholder={t('describeYourUpdateProgressInDetail')}
                                    onBlur={field.handleBlur}
                                    onChange={event => field.handleChange(event.target.value)}
                                    aria-invalid={isInvalid}
                                    data-testid="progress-comment-input"
                                />
                                {isInvalid ? <FieldError errors={errors} /> : null}
                            </Field>
                        );
                    }}
                </form.Field>
            </FieldGroup>
            <Button
                type="submit"
                disabled={createProgress.isPending}
                data-testid="progress-save-button"
            >
                {createProgress.isPending ? tCommon('actions.saving') : t('saveProgress')}
            </Button>
        </form>
    );
}
