'use client';

import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { CreateOrganization } from '@/features/organizations/schemas/organization';
import { useOrganizationFormSchema } from '@/features/organizations/hooks/use-organization-form-schemas';
import { useTranslations } from 'next-intl';
import { useTranslations as useTranslationsCommon } from 'next-intl';
import { useCreateOrganization } from '@/features/organizations/hooks/use-organizations';
import FormModal from '@/components/forms/form-modal';
import { getFieldErrors } from '@/components/forms/form-utils';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { CategoryListEditor } from '@/features/categories/components/category-list-editor';
import { toCategoryDraft } from '@/features/categories/schemas/category';

export default function CreateOrganizationFormModal() {
    const t = useTranslations('Organizations');
    const tCommon = useTranslationsCommon('Common');
    const createOrganization = useCreateOrganization();
    const organizationSchema = useOrganizationFormSchema();
    const router = useRouter();
    const catalog = useQuery(convexQuery(api.platformCategories.listPlatformCategories, {}));

    // The whole catalog to trim or extend (decision 13); the button waits, as typing fixes defaults.
    const defaultValues: CreateOrganization = {
        name: '',
        categories: catalog.data?.map(toCategoryDraft) ?? [],
    };

    return (
        <FormModal<CreateOrganization>
            trigger={
                <Button
                    className="gap-2"
                    disabled={catalog.isPending}
                    data-testid="organization-create-open"
                >
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
                // Better Auth makes the new organization the active one.
                toast.success(t('toast.createdAndActive', { name: values.name.trim() }));
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
                            const value = field.state.value;

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
                    <form.Field name="categories">
                        {field => (
                            <Field>
                                <p className="text-sm font-medium">{t('categories')}</p>
                                <FieldDescription>{t('categoriesDescription')}</FieldDescription>
                                <CategoryListEditor
                                    value={field.state.value}
                                    onChange={field.handleChange}
                                />
                            </Field>
                        )}
                    </form.Field>
                </FieldGroup>
            )}
        </FormModal>
    );
}
