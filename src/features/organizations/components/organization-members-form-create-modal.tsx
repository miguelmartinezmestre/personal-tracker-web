'use client';
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
                    {t('createNewOrganizationMember')}
                </Button>
            }
            title={t('createNewOrganizationMember')}
            description={t('createNewOrganizationMemberDescription')}
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
            submitLabel={t('saveOrganizationMember')}
            pendingLabel={tCommon('loading')}
            cancelLabel={t('cancel')}
            isPending={createOrganizationMember.isPending}
            cancelTestId="organization-member-cancel-button"
            submitTestId="organization-member-save-button"
        >
            {form => (
                <>
                    <form.Field name="email">
                        {field => (
                            <FieldShell error={getFieldError(form, field)}>
                                <FormItem>
                                    <FormLabel>{t('email')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t('enterEmail')}
                                            type="email"
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
                                            data-testid="organization-member-email-input"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        {t('giveYourOrganizationMemberAClearConciseEmail')}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            </FieldShell>
                        )}
                    </form.Field>

                    <form.Field name="role">
                        {field => (
                            <FieldShell error={getFieldError(form, field)}>
                                <FormItem>
                                    <FormLabel>{t('role')}</FormLabel>
                                    <Select
                                        onValueChange={value => field.handleChange(value)}
                                        value={
                                            typeof field.state.value === 'string'
                                                ? field.state.value
                                                : 'member'
                                        }
                                    >
                                        <FormControl>
                                            <SelectTrigger
                                                onBlur={field.handleBlur}
                                                data-testid="organization-member-role-select"
                                            >
                                                <SelectValue placeholder={t('selectRole')} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {roleOptions.map(role => (
                                                <SelectItem key={role.value} value={role.value}>
                                                    {role.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        {t('currentRoleOfYourOrganizationMember')}
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
