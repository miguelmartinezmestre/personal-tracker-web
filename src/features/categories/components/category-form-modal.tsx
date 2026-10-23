'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import FormModal from '@/components/forms/form-modal';
import { getFieldErrors } from '@/components/forms/form-utils';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { CategoryIconSelect } from '@/features/categories/components/category-icon-select';
import { categorySchema, type CategoryDraft } from '@/features/categories/schemas/category';

/** Creates or edits one category, of the organization or of the platform catalog. */
export function CategoryFormModal({
    trigger,
    title,
    defaultValues,
    onSubmit,
    isPending,
}: {
    trigger: React.ReactElement;
    title: string;
    defaultValues: CategoryDraft;
    onSubmit: (values: CategoryDraft) => Promise<void>;
    isPending: boolean;
}) {
    const t = useTranslations('Categories');
    const schema = useMemo(() => categorySchema(key => t(`validation.${key}`)), [t]);

    return (
        <FormModal<CategoryDraft>
            trigger={trigger}
            title={title}
            formOptions={{ defaultValues, validators: { onChange: schema, onSubmit: schema } }}
            onSubmit={onSubmit}
            submitLabel={t('form.save')}
            cancelLabel={t('form.cancel')}
            isPending={isPending}
            cancelTestId="category-cancel-button"
            submitTestId="category-save-button"
        >
            {form => (
                <FieldGroup>
                    <form.Field name="name">
                        {field => {
                            const errors = getFieldErrors(form, field);

                            return (
                                <Field data-invalid={errors.length > 0}>
                                    <FieldLabel htmlFor="category-name">
                                        {t('form.name')}
                                    </FieldLabel>
                                    <Input
                                        id="category-name"
                                        value={field.state.value}
                                        onChange={event => field.handleChange(event.target.value)}
                                        onBlur={field.handleBlur}
                                        aria-invalid={errors.length > 0}
                                        data-testid="category-name-input"
                                    />
                                    {errors.length > 0 && <FieldError errors={errors} />}
                                </Field>
                            );
                        }}
                    </form.Field>
                    <div className="flex gap-4">
                        <form.Field name="color">
                            {field => (
                                <Field className="w-auto">
                                    <FieldLabel htmlFor="category-color">
                                        {t('form.color')}
                                    </FieldLabel>
                                    <input
                                        id="category-color"
                                        type="color"
                                        value={field.state.value}
                                        onChange={event => field.handleChange(event.target.value)}
                                        className="h-9 w-14 cursor-pointer rounded border p-0.5"
                                        data-testid="category-color-input"
                                    />
                                </Field>
                            )}
                        </form.Field>
                        <form.Field name="icon">
                            {field => (
                                <Field>
                                    <FieldLabel htmlFor="category-icon">
                                        {t('form.icon')}
                                    </FieldLabel>
                                    <CategoryIconSelect
                                        id="category-icon"
                                        value={field.state.value}
                                        onValueChange={field.handleChange}
                                        testId="category-icon-select"
                                    />
                                </Field>
                            )}
                        </form.Field>
                    </div>
                </FieldGroup>
            )}
        </FormModal>
    );
}
