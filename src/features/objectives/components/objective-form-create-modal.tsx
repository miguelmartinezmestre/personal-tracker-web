'use client';

import { PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { Button } from '@/components/ui/button';
import FormModal from '@/components/forms/form-modal';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { DEFAULT_DUE_SOON_DAYS } from '@/convex/features/objectives/constants';
import { dateInputToUtcTimestamp } from '@/features/objectives/lib/dates';
import { ObjectiveFormFields } from '@/features/objectives/components/objective-form-fields';
import { useObjectiveFormSchema } from '@/features/objectives/hooks/use-form-schemas';
import { NONE_CATEGORY, type ObjectiveFormValues } from '@/features/objectives/schemas/objective';
import { useTranslations } from 'next-intl';

const defaultValues: ObjectiveFormValues = {
    title: '',
    description: '',
    categoryId: NONE_CATEGORY,
    unit: '',
    direction: 'increase',
    startValue: 0,
    targetValue: 1,
    deadline: '',
    dueSoonDays: DEFAULT_DUE_SOON_DAYS,
    memberAccess: 'view',
    users: [],
};

export default function CreateObjectiveFormModal({
    triggerTestId = 'objective-create-open',
}: {
    triggerTestId?: string;
}) {
    const t = useTranslations('Objectives');
    const tCommon = useTranslations('Common');
    const formSchema = useObjectiveFormSchema();

    const createObjective = useMutation({
        mutationFn: useConvexMutation(api.objectives.createObjective),
    });

    return (
        <FormModal<ObjectiveFormValues>
            trigger={
                <Button className="gap-2" data-testid={triggerTestId}>
                    <PlusCircle className="h-4 w-4" />
                    {t('createObjective')}
                </Button>
            }
            title={t('createObjective')}
            description={t('createObjectiveDescription')}
            formOptions={{
                defaultValues,
                validators: {
                    onChange: formSchema,
                    onSubmit: formSchema,
                },
            }}
            onSubmit={async values => {
                const categoryId =
                    values.categoryId === NONE_CATEGORY
                        ? undefined
                        : (values.categoryId as Id<'categories'>);

                const deadline = dateInputToUtcTimestamp(values.deadline);

                await createObjective.mutateAsync({
                    title: values.title,
                    direction: values.direction,
                    startValue: values.startValue,
                    targetValue: values.targetValue,
                    description: values.description.trim() || undefined,
                    unit: values.unit.trim() || undefined,
                    categoryId,
                    deadline,
                    dueSoonDays: deadline === undefined ? undefined : values.dueSoonDays,
                    memberAccess: values.memberAccess,
                    users: values.users.map(({ userId, access }) => ({ userId, access })),
                });
                toast.success(t('toast.created'));
            }}
            submitLabel={t('saveObjective')}
            pendingLabel={tCommon('actions.saving')}
            cancelLabel={t('cancel')}
            isPending={createObjective.isPending}
            cancelTestId="objective-cancel-button"
            submitTestId="objective-save-button"
        >
            {form => <ObjectiveFormFields form={form} withAccess />}
        </FormModal>
    );
}
