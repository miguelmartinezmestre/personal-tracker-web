'use client';

import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import FormModal from '@/components/forms/form-modal';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

const DURATIONS = ['permanent', '1', '7', '30'] as const;

const banSchema = z.object({ reason: z.string(), duration: z.enum(DURATIONS) });

type BanFormValues = z.infer<typeof banSchema>;

/** A permanent or temporary ban; a temporary one stops blocking once it expires (INH-ADM-03). */
export default function BanUserDialog({ userId, name }: { userId: Id<'user'>; name: string }) {
    const t = useTranslations('Admin.ban');
    const tCommon = useTranslations('Common');
    const ban = useMutation({ mutationFn: useConvexMutation(api.admin.banUser) });

    const durationItems = DURATIONS.map(duration => ({
        value: duration,
        label: t(`durations.${duration}`),
    }));

    const defaultValues: BanFormValues = { reason: '', duration: 'permanent' };

    return (
        <FormModal<BanFormValues>
            trigger={
                <Button variant="destructive" size="sm" data-testid="admin-ban-open">
                    {t('open')}
                </Button>
            }
            title={t('title', { name })}
            description={t('description')}
            formOptions={{ defaultValues, validators: { onSubmit: banSchema } }}
            onSubmit={async values => {
                await ban.mutateAsync({
                    userId,
                    reason: values.reason.trim() || undefined,
                    durationDays:
                        values.duration === 'permanent' ? undefined : Number(values.duration),
                });
                toast.success(t('banned'));
            }}
            submitLabel={t('submit')}
            pendingLabel={tCommon('actions.saving')}
            cancelLabel={t('cancel')}
            isPending={ban.isPending}
            submitTestId="admin-ban-submit"
        >
            {form => (
                <FieldGroup>
                    <form.Field name="reason">
                        {field => (
                            <Field>
                                <FieldLabel htmlFor="ban-reason">{t('reason')}</FieldLabel>
                                <Input
                                    id="ban-reason"
                                    value={field.state.value}
                                    onChange={event => field.handleChange(event.target.value)}
                                    onBlur={field.handleBlur}
                                />
                            </Field>
                        )}
                    </form.Field>
                    <form.Field name="duration">
                        {field => (
                            <Field>
                                <FieldLabel htmlFor="ban-duration">{t('duration')}</FieldLabel>
                                <Select
                                    value={field.state.value}
                                    items={durationItems}
                                    onValueChange={value => {
                                        const duration = DURATIONS.find(option => option === value);

                                        if (duration) {
                                            field.handleChange(duration);
                                        }
                                    }}
                                >
                                    <SelectTrigger
                                        id="ban-duration"
                                        data-testid="admin-ban-duration"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {durationItems.map(item => (
                                            <SelectItem key={item.value} value={item.value}>
                                                {item.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                        )}
                    </form.Field>
                </FieldGroup>
            )}
        </FormModal>
    );
}
