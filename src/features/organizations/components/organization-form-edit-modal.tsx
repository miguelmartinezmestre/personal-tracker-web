'use client';
import type { z } from 'zod';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    FieldShell,
    getFieldError,
    FormControl,
    FormDescription,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form-fields';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { savedOrganizationSchema } from '@/features/organizations/schemas/organization';
import { useTranslations } from 'next-intl';
import { useTranslations as useTranslationsCommon } from 'next-intl';
import {
    useUpdateOrganization,
    type Organization,
} from '@/features/organizations/hooks/use-organizations';
import FormModal from '@/components/forms/form-modal';
export default function EditOrganizationFormModal({
    defaultValues,
}: {
    defaultValues: Organization;
}) {
    const t = useTranslations('Organizations');
    const tCommon = useTranslationsCommon('Common');
    const updateOrganization = useUpdateOrganization();
    return (
        <FormModal<z.infer<typeof savedOrganizationSchema>>
            trigger={
                <Button className="gap-2" data-testid="organization-edit-open">
                    <PlusCircle className="h-4 w-4" />
                    {t('editOrganization')}
                </Button>
            }
            title={t('editOrganization')}
            description={t('editOrganizationDescription')}
            formOptions={{
                defaultValues: {
                    id: defaultValues.id,
                    name: defaultValues.name,
                    description: defaultValues.description,
                },
                validators: {
                    onChange: savedOrganizationSchema,
                    onSubmit: savedOrganizationSchema,
                },
            }}
            onSubmit={async (values: z.infer<typeof savedOrganizationSchema>) => {
                await updateOrganization.mutateAsync({
                    id: values.id,
                    name: values.name,
                    description: values.description,
                });
            }}
            submitLabel={t('saveOrganization')}
            pendingLabel={tCommon('loading')}
            cancelLabel={t('cancel')}
            isPending={updateOrganization.isPending}
            cancelTestId="organization-edit-cancel-button"
            submitTestId="organization-edit-save-button"
        >
            {form => (
                <>
                    <form.Field name="name">
                        {field => (
                            <FieldShell error={getFieldError(form, field)}>
                                <FormItem>
                                    <FormLabel>{t('name')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t('enterOrganizationName')}
                                            name={field.name}
                                            value={
                                                typeof field.state.value === 'string'
                                                    ? field.state.value
                                                    : ''
                                            }
                                            onChange={event =>
                                                field.handleChange(event.target.value)
                                            }
                                            onBlur={field.handleBlur}
                                            data-testid="organization-edit-name-input"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        {t('giveYourOrganizationAClearConciseName')}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            </FieldShell>
                        )}
                    </form.Field>

                    <form.Field name="description">
                        {field => (
                            <FieldShell error={getFieldError(form, field)}>
                                <FormItem>
                                    <FormLabel>{t('tableDescription')}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder={t('describeOrganizationInDetail')}
                                            className="resize-none min-h-[80px]"
                                            name={field.name}
                                            value={
                                                typeof field.state.value === 'string'
                                                    ? field.state.value
                                                    : ''
                                            }
                                            onChange={event =>
                                                field.handleChange(event.target.value)
                                            }
                                            onBlur={field.handleBlur}
                                            data-testid="organization-edit-description-input"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        {t('optionalAddDetailsAboutYourOrganization')}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            </FieldShell>
                        )}
                    </form.Field>
                </>
            )}
        </FormModal>
    );
}
