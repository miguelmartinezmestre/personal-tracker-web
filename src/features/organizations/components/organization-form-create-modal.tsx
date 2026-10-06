'use client';
import type { z } from 'zod';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { CreateOrganization } from '@/features/organizations/schemas/organization';
import { organizationSchema } from '@/features/organizations/schemas/organization';
import { useTranslations } from 'next-intl';
import { useTranslations as useTranslationsCommon } from 'next-intl';
import { useCreateOrganization } from '@/features/organizations/hooks/use-organizations';
import FormModal from '@/components/forms/form-modal';
import { getFieldErrors } from '@/components/forms/form-utils';
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
                <FieldGroup>
                    <form.Field name="name">
                        {field => {
                            const errors = getFieldErrors(form, field);
                            const isInvalid = !!errors.length;
                            let value = '';
                            if (typeof field.state.value === 'string') {
                                value = field.state.value;
                            }
                            return (
                                <Field data-invalid={isInvalid}>
                                    <FieldLabel htmlFor={field.name}>{t('name')}</FieldLabel>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        placeholder={t('enterOrganizationName')}
                                        value={value}
                                        onChange={event => field.handleChange(event.target.value)}
                                        onBlur={field.handleBlur}
                                        aria-invalid={isInvalid}
                                        data-testid="organization-name-input"
                                    />
                                    <FieldDescription>
                                        {t('giveYourOrganizationAClearConciseTitle')}
                                    </FieldDescription>
                                    {isInvalid && <FieldError errors={errors} />}
                                </Field>
                            );
                        }}
                    </form.Field>

                    <form.Field name="description">
                        {field => {
                            const errors = getFieldErrors(form, field);
                            const isInvalid = !!errors.length;
                            let value = '';
                            if (typeof field.state.value === 'string') {
                                value = field.state.value;
                            }
                            return (
                                <Field data-invalid={isInvalid}>
                                    <FieldLabel htmlFor={field.name}>
                                        {t('tableDescription')}
                                    </FieldLabel>
                                    <Textarea
                                        id={field.name}
                                        name={field.name}
                                        placeholder={t('describeOrganizationInDetail')}
                                        className="resize-none min-h-[80px]"
                                        value={value}
                                        onChange={event => field.handleChange(event.target.value)}
                                        onBlur={field.handleBlur}
                                        aria-invalid={isInvalid}
                                        data-testid="organization-description-input"
                                    />
                                    <FieldDescription>
                                        {t('optionalAddDetailsAboutYourOrganization')}
                                    </FieldDescription>
                                    {isInvalid && <FieldError errors={errors} />}
                                </Field>
                            );
                        }}
                    </form.Field>
                </FieldGroup>
            )}
        </FormModal>
    );
}
