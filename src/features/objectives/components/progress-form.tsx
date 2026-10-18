'use client';

import { useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { focusFirstInvalidField } from '@/components/forms/form-utils';
import type { Id } from '@/convex/_generated/dataModel';
import { dateInputToUtcTimestamp, todayDateInput } from '@/features/objectives/lib/dates';
import { ProgressFields } from '@/features/objectives/components/progress-fields';
import { useProgressFormSchema } from '@/features/objectives/hooks/use-form-schemas';
import { type ProgressFormValues } from '@/features/objectives/schemas/objective';
import { useTranslations } from 'next-intl';

export default function ProgressForm({
    objectiveId,
    currentValue,
    targetValue,
    unit,
}: {
    objectiveId: Id<'objectives'>;
    currentValue: number;
    targetValue: number;
    unit?: string | undefined;
}) {
    const t = useTranslations('UpdateProgress');
    const tCommon = useTranslations('Common');
    const formSchema = useProgressFormSchema();
    const formRef = useRef<HTMLFormElement>(null);

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
            onChange: formSchema,
            onSubmit: formSchema,
        },
        onSubmit: async ({ value, formApi }) => {
            const updateDate = dateInputToUtcTimestamp(value.updateDate);

            if (updateDate === undefined) {
                return;
            }

            try {
                await createProgress.mutateAsync({
                    objectiveId,
                    updatedValue: value.updatedValue,
                    updateDate,
                    comment: value.comment.trim() || undefined,
                });
            } catch {
                // The mutation cache already reports the error; keep the values to retry.
                return;
            }

            // Same 15-digit rounding as the stored total, so 0.7 + 0.1 reaches a target of 0.8.
            const reachedTarget =
                Number((currentValue + value.updatedValue).toPrecision(15)) >= targetValue;

            toast.success(reachedTarget ? t('toast.completed') : t('toast.created'));
            formApi.reset();
        },
        onSubmitInvalid: () => focusFirstInvalidField(formRef.current),
    });

    return (
        <form
            ref={formRef}
            noValidate
            className="space-y-4"
            data-testid="progress-form"
            onSubmit={event => {
                event.preventDefault();
                void form.handleSubmit();
            }}
        >
            <ProgressFields
                form={form}
                idPrefix=""
                testIdPrefix="progress"
                valueLabel={unit ? t('updatedValueWithUnit', { unit }) : t('updatedValue')}
                valueHint={t('deltaDescription')}
                commentPlaceholder={t('describeYourUpdateProgressInDetail')}
            />
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
