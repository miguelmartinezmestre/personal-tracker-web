'use client';

import { useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { isTargetReached } from '@/convex/features/objectives/rules';
import { focusFirstInvalidField } from '@/components/forms/form-utils';
import { dateInputToUtcTimestamp, todayDateInput } from '@/features/objectives/lib/dates';
import { progressDifference, roundValue } from '@/features/objectives/lib/progress';
import { ProgressFields } from '@/features/objectives/components/progress-fields';
import { useProgressFormSchema } from '@/features/objectives/hooks/use-form-schemas';
import { type ProgressFormValues } from '@/features/objectives/schemas/objective';
import type { ObjectiveSummary } from '@/features/objectives/hooks/use-objectives';
import { useTranslations } from 'next-intl';

export default function ProgressForm({ objective }: { objective: ObjectiveSummary }) {
    const t = useTranslations('UpdateProgress');
    const tCommon = useTranslations('Common');
    const formSchema = useProgressFormSchema(objective.currentValue);
    const formRef = useRef<HTMLFormElement>(null);

    const createProgress = useMutation({
        mutationFn: useConvexMutation(api.progress.createProgress),
    });

    const defaultValues: ProgressFormValues = {
        mode: 'difference',
        amount: Number.NaN,
        updateDate: todayDateInput(),
        comment: '',
    };

    const form = useForm({
        defaultValues,
        validators: {
            onChange: formSchema,
            onSubmit: formSchema,
        },
        onSubmit: async ({ value, formApi }) => {
            const updateDate = dateInputToUtcTimestamp(value.updateDate);

            if (updateDate === undefined) {
                return;
            }

            const difference = progressDifference(value.mode, value.amount, objective.currentValue);

            try {
                await createProgress.mutateAsync({
                    objectiveId: objective.id,
                    updatedValue: difference,
                    updateDate,
                    comment: value.comment.trim() || undefined,
                });
            } catch {
                return;
            }

            const reachedTarget = isTargetReached(
                objective.direction,
                roundValue(objective.currentValue + difference),
                objective.targetValue
            );

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
                baseValue={objective.currentValue}
                unit={objective.unit}
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
