'use client';
import type { z } from 'zod';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form-tanstack';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Organization } from '@/features/organizations/schemas/organization';
import { savedOrganizationSchema } from '@/features/organizations/schemas/organization';
import { useTranslations } from 'next-intl';
import { useTranslations as useTranslationsCommon } from 'next-intl';
import { useUpdateOrganization } from '@/features/organizations/hooks/use-organizations';
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
            onSubmit={async (values: Organization) => {
                await updateOrganization.mutateAsync({
                    id: values.id || defaultValues.id,
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
            {() => (
                <>
                    <FormField
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('name')}</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder={t('enterOrganizationName')}
                                        {...field}
                                        data-testid="organization-edit-name-input"
                                    />
                                </FormControl>
                                <FormDescription>
                                    {t('giveYourOrganizationAClearConciseName')}
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('tableDescription')}</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder={t('describeOrganizationInDetail')}
                                        className="resize-none min-h-[80px]"
                                        {...field}
                                        value={typeof field.value === 'string' ? field.value : ''}
                                        data-testid="organization-edit-description-input"
                                    />
                                </FormControl>
                                <FormDescription>
                                    {t('optionalAddDetailsAboutYourOrganization')}
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </>
            )}
        </FormModal>
    );
}
