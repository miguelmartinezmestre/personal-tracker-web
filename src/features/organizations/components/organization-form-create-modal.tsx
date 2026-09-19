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
import type { CreateOrganization } from '@/features/organizations/schemas/organization';
import { organizationSchema } from '@/features/organizations/schemas/organization';
import { useTranslations } from 'next-intl';
import { useTranslations as useTranslationsCommon } from 'next-intl';
import { useCreateOrganization } from '@/features/organizations/hooks/use-organizations';
import FormModal from '@/components/forms/form-modal';
import { useRouter } from 'next/navigation';
const defaultValues: CreateOrganization = {
    name: '',
    description: '',
};
export default function CreateOrganizationFormModal() {
    const t = useTranslations('Organizations');
    const tCommon = useTranslationsCommon('Common');
    const createOrganization = useCreateOrganization();
    const router = useRouter();
    return (
        <FormModal<z.infer<typeof organizationSchema>>
            trigger={
                <Button className="gap-2" data-testid="organization-create-open">
                    <PlusCircle className="h-4 w-4" />
                    {t('createOrganization')}
                </Button>
            }
            title={t('createOrganization')}
            description={t('createOrganizationDescription')}
            formOptions={{
                defaultValues,
                validators: {
                    onChange: organizationSchema,
                    onSubmit: organizationSchema,
                },
            }}
            onSubmit={async (values: CreateOrganization) => {
                await createOrganization.mutateAsync(values);
                router.refresh();
            }}
            submitLabel={t('saveOrganization')}
            pendingLabel={tCommon('loading')}
            cancelLabel={t('cancel')}
            isPending={createOrganization.isPending}
            cancelTestId="organization-cancel-button"
            submitTestId="organization-save-button"
        >
            {form => (
                <>
                    <form.Field name="name">
                        {field => (
                            <FieldShell name={field.name} error={getFieldError(form, field)}>
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
                                            data-testid="organization-name-input"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        {t('giveYourOrganizationAClearConciseTitle')}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            </FieldShell>
                        )}
                    </form.Field>

                    <form.Field name="description">
                        {field => (
                            <FieldShell name={field.name} error={getFieldError(form, field)}>
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
                                            data-testid="organization-description-input"
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
