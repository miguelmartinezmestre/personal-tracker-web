'use client';

import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import type { OrganizationMember } from '@/features/organizations/schemas/organization-member';
import { savedOrganizationMemberSchema } from '@/features/organizations/schemas/organization-member';
import {
    Select,
    SelectItem,
    SelectContent,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { OrganizationRole, isOrganizationRoleValue } from '../types/roles';
import { useTranslations } from 'next-intl';
import { useTranslations as useTranslationsCommon } from 'next-intl';
import { useUpdateOrganizationMember } from '@/features/organizations/hooks/use-organization-members';
import FormModal from '@/components/forms/form-modal';
import { getFieldErrors } from '@/components/forms/form-utils';

export default function OrganizationMemberEditFormModal({
    defaultValues,
    canAssignOwner,
}: {
    defaultValues: OrganizationMember;
    canAssignOwner: boolean;
}) {
    const t = useTranslations('OrganizationMembers');
    const tCommon = useTranslationsCommon('Common');

    const roleOptions = [
        ...(canAssignOwner ? [{ value: OrganizationRole.OWNER, label: t('roles.owner') }] : []),
        { value: OrganizationRole.ADMIN, label: t('roles.admin') },
        { value: OrganizationRole.MEMBER, label: t('roles.member') },
    ];

    const updateOrganizationMember = useUpdateOrganizationMember();

    return (
        <FormModal<OrganizationMember>
            trigger={
                <Button className="gap-2" data-testid="organization-member-edit-open">
                    <Pencil className="h-4 w-4" aria-hidden />
                    {t('edit')}
                </Button>
            }
            title={t('edit')}
            description={t('editOrganizationMemberDescription')}
            formOptions={{
                defaultValues,
                validators: {
                    onChange: savedOrganizationMemberSchema,
                    onSubmit: savedOrganizationMemberSchema,
                },
            }}
            onSubmit={async (values: OrganizationMember) => {
                if (!isOrganizationRoleValue(values.role)) {
                    return;
                }

                await updateOrganizationMember.mutateAsync({
                    memberId: values.id,
                    organizationId: values.organizationId,
                    role: values.role,
                });
            }}
            submitLabel={t('saveOrganizationMember')}
            pendingLabel={tCommon('loading')}
            cancelLabel={t('cancel')}
            isPending={updateOrganizationMember.isPending}
            cancelTestId="organization-member-edit-cancel-button"
            submitTestId="organization-member-edit-save-button"
        >
            {form => (
                <FieldGroup>
                    <form.Field name="email">
                        {field => {
                            const errors = getFieldErrors(form, field);
                            const isInvalid = !!errors.length;
                            const value = field.state.value;

                            return (
                                <Field data-invalid={isInvalid}>
                                    <FieldLabel htmlFor={field.name}>{t('email')}</FieldLabel>
                                    <p
                                        id={field.name}
                                        className="text-sm text-muted-foreground py-2"
                                    >
                                        {value}
                                    </p>
                                    <FieldDescription>
                                        {t('giveYourOrganizationMemberAClearConciseEmail')}
                                    </FieldDescription>
                                    {isInvalid && <FieldError errors={errors} />}
                                </Field>
                            );
                        }}
                    </form.Field>

                    <form.Field name="role">
                        {field => {
                            const errors = getFieldErrors(form, field);
                            const isInvalid = !!errors.length;
                            const value = field.state.value;

                            return (
                                <Field data-invalid={isInvalid}>
                                    <FieldLabel htmlFor={field.name}>{t('role')}</FieldLabel>
                                    <Select
                                        name={field.name}
                                        onValueChange={value => {
                                            if (value !== null && isOrganizationRoleValue(value)) {
                                                field.handleChange(value);
                                            }
                                        }}
                                        value={value}
                                        items={roleOptions}
                                    >
                                        <SelectTrigger
                                            id={field.name}
                                            onBlur={field.handleBlur}
                                            aria-invalid={isInvalid}
                                            data-testid="organization-member-edit-role-select"
                                        >
                                            <SelectValue placeholder={t('selectRole')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {roleOptions.map(role => (
                                                <SelectItem key={role.value} value={role.value}>
                                                    {role.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FieldDescription>
                                        {t('currentRoleOfYourOrganizationMember')}
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
