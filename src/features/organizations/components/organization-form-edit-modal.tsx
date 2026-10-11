'use client';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { SavedOrganization } from '@/features/organizations/schemas/organization';
import { useSavedOrganizationFormSchema } from '@/features/organizations/hooks/use-organization-form-schemas';
import { useTranslations } from 'next-intl';
import { useTranslations as useTranslationsCommon } from 'next-intl';
import {
    useUpdateOrganization,
    type Organization,
} from '@/features/organizations/hooks/use-organizations';
import FormModal from '@/components/forms/form-modal';
import { getFieldErrors } from '@/components/forms/form-utils';
export default function EditOrganizationFormModal({
    defaultValues,
}: {
    defaultValues: Organization;
}) {
    const t = useTranslations('Organizations');
    const tCommon = useTranslationsCommon('Common');
    const updateOrganization = useUpdateOrganization();
    const savedOrganizationSchema = useSavedOrganizationFormSchema();
    return (
        <FormModal<SavedOrganization>
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
            onSubmit={async (values: SavedOrganization) => {
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
                                        data-testid="organization-edit-name-input"
                                    />
                                    <FieldDescription>
                                        {t('giveYourOrganizationAClearConciseName')}
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
                                        data-testid="organization-edit-description-input"
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
