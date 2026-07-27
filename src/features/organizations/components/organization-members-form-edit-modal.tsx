'use client';

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
import {
    OrganizationMember,
    savedOrganizationMemberSchema,
} from '@/features/organizations/schemas/organization-member';
import {
    Select,
    SelectItem,
    SelectContent,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { OrganizationRole } from '../types/roles';
import { useTranslations } from 'next-intl';
import { useTranslations as useTranslationsCommon } from 'next-intl';
import { useUpdateOrganizationMember } from '@/features/organizations/hooks/use-organization-members';
import FormModal from '@/components/forms/form-modal';

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
                    <PlusCircle className="h-4 w-4" />
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
                await updateOrganizationMember.mutateAsync({
                    memberId: values.id,
                    organizationId: values.organizationId,
                    role: values.role as 'owner' | 'admin' | 'member',
                });
            }}
            submitLabel={t('saveOrganizationMember')}
            pendingLabel={tCommon('loading')}
            cancelLabel={t('cancel')}
            isPending={updateOrganizationMember.isPending}
            cancelTestId="organization-member-edit-cancel-button"
            submitTestId="organization-member-edit-save-button"
        >
            {() => (
                <>
                    <FormField
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('email')}</FormLabel>
                                <p className="text-sm text-muted-foreground py-2">
                                    {(field.value as string) || ''}
                                </p>
                                <FormDescription>
                                    {t('giveYourOrganizationMemberAClearConciseEmail')}
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        name="role"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('role')}</FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    value={(field.value as string) || 'member'}
                                >
                                    <FormControl>
                                        <SelectTrigger data-testid="organization-member-edit-role-select">
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
                        )}
                    />
                </>
            )}
        </FormModal>
    );
}
