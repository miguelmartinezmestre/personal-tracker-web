'use client';

import { toast } from 'sonner';
import { Users } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import FormModal from '@/components/forms/form-modal';
import { api } from '@/convex/_generated/api';
import { AccessEditor } from '@/features/objectives/components/access-editor';
import type { ObjectiveSummary } from '@/features/objectives/hooks/use-objectives';
import { accessSchema, type AccessFormValues } from '@/features/objectives/schemas/objective';

export default function ObjectiveAccessDialog({ objective }: { objective: ObjectiveSummary }) {
    const t = useTranslations('Objectives.access');
    const tCommon = useTranslations('Common');

    const access = useQuery(
        convexQuery(api.objectiveAccess.getObjectiveAccess, { objectiveId: objective.id })
    );

    const updateAccess = useMutation({
        mutationFn: useConvexMutation(api.objectiveAccess.updateObjectiveAccess),
    });

    const trigger = (
        <Button
            variant="outline"
            size="sm"
            disabled={!access.data}
            data-testid="objective-access-open"
        >
            <Users aria-hidden />
            {t('manage')}
        </Button>
    );

    if (!access.data) {
        return trigger;
    }

    const defaultValues: AccessFormValues = access.data;

    return (
        <FormModal<AccessFormValues>
            trigger={trigger}
            title={t('title')}
            description={t('description')}
            formOptions={{
                defaultValues,
                validators: { onSubmit: accessSchema },
            }}
            onSubmit={async values => {
                await updateAccess.mutateAsync({
                    objectiveId: objective.id,
                    memberAccess: values.memberAccess,
                    users: values.users.map(({ userId, access: level }) => ({
                        userId,
                        access: level,
                    })),
                });
                toast.success(t('saved'));
            }}
            submitLabel={t('save')}
            pendingLabel={tCommon('actions.saving')}
            cancelLabel={t('cancel')}
            isPending={updateAccess.isPending}
            submitTestId="objective-access-save"
        >
            {form => (
                <form.Subscribe
                    selector={state => ({
                        memberAccess: state.values.memberAccess,
                        users: state.values.users,
                    })}
                >
                    {({ memberAccess, users }) => (
                        <AccessEditor
                            memberAccess={memberAccess}
                            onMemberAccessChange={value =>
                                form.setFieldValue('memberAccess', value)
                            }
                            users={users}
                            onUsersChange={value => form.setFieldValue('users', value)}
                        />
                    )}
                </form.Subscribe>
            )}
        </FormModal>
    );
}
