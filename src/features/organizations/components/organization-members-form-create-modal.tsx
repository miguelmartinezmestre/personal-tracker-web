'use client';

import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { CreateOrganizationMember } from '@/features/organizations/schemas/organization-member';
import { organizationMemberSchema } from '@/features/organizations/schemas/organization-member';
import {
    Select,
    SelectItem,
    SelectContent,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useTranslations } from 'next-intl';
import { useTranslations as useTranslationsCommon } from 'next-intl';
import { useCreateOrganizationMember } from '@/features/organizations/hooks/use-organization-members';
import { OrganizationRole, isOrganizationRoleValue } from '../types/roles';
import FormModal from '@/components/forms/form-modal';
import { getFieldErrors } from '@/components/forms/form-utils';

interface CreateOrganizationMemberFormModalProps {
    organizationId: string;
    canAssignOwner: boolean;
}

export default function CreateOrganizationMemberFormModal({
    organizationId,
    canAssignOwner,
}: CreateOrganizationMemberFormModalProps) {
    const t = useTranslations('OrganizationMembers');
    const tCommon = useTranslationsCommon('Common');
    const createOrganizationMember = useCreateOrganizationMember();

    const roleOptions = [
        ...(canAssignOwner ? [{ value: OrganizationRole.OWNER, label: t('roles.owner') }] : []),
        { value: OrganizationRole.ADMIN, label: t('roles.admin') },
        { value: OrganizationRole.MEMBER, label: t('roles.member') },
    ];

    return (
        <FormModal<CreateOrganizationMember>
            trigger={
                <Button className="gap-2" data-testid="organization-member-create-open">
                    <PlusCircle className="h-4 w-4" />
                    {t('inviteMember')}
                </Button>
            }
            title={t('inviteMember')}
            description={t('inviteMemberDescription')}
            formOptions={{
                defaultValues: {
                    email: '',
                    role: 'member',
                    organizationId: organizationId,
                },
                validators: {
                    onChange: organizationMemberSchema,
                    onSubmit: organizationMemberSchema,
                },
            }}
            onSubmit={async (values: CreateOrganizationMember) => {
                if (!isOrganizationRoleValue(values.role)) {
                    return;
                }

                await createOrganizationMember.mutateAsync({
                    organizationId: organizationId,
                    email: values.email,
                    role: values.role,
                });
            }}
            submitLabel={t('sendInvitation')}
            pendingLabel={tCommon('loading')}
            cancelLabel={t('cancel')}
            isPending={createOrganizationMember.isPending}
            cancelTestId="organization-member-cancel-button"
            submitTestId="organization-member-save-button"
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
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        placeholder={t('enterEmail')}
                                        type="email"
                                        value={value}
                                        onChange={event => field.handleChange(event.target.value)}
                                        onBlur={field.handleBlur}
                                        aria-invalid={isInvalid}
                                        data-testid="organization-member-email-input"
                                    />
                                    <FieldDescription>{t('inviteEmailHelp')}</FieldDescription>
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
                                            data-testid="organization-member-role-select"
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
                                    <FieldDescription>{t('inviteRoleHelp')}</FieldDescription>
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
