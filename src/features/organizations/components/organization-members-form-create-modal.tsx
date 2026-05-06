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
import { Input } from '@/components/ui/input';
import {
    CreateOrganizationMember,
    organizationMemberSchema,
} from '@/features/organizations/schemas/organization-member';
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
import { OrganizationRole } from '../types/roles';
import FormModal from '@/components/form-modal';

interface CreateOrganizationMemberFormModalProps {
    organizationId: string;
}

export default function CreateOrganizationMemberFormModal({
    organizationId,
}: CreateOrganizationMemberFormModalProps) {
    const t = useTranslations('OrganizationMembers');
    const tCommon = useTranslationsCommon('Common');
    const createOrganizationMember = useCreateOrganizationMember();

    const roleOptions = [
        { value: OrganizationRole.OWNER, label: t('roles.owner') },
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
                await createOrganizationMember.mutateAsync({
                    organizationId: organizationId,
                    email: values.email,
                    role: values.role as OrganizationRole,
                });
            }}
            submitLabel={t('saveOrganizationMember')}
            pendingLabel={tCommon('loading')}
            cancelLabel={t('cancel')}
            isPending={createOrganizationMember.isPending}
            cancelTestId="organization-member-cancel-button"
            submitTestId="organization-member-save-button"
        >
            {() => (
                <>
                    <FormField
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('email')}</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder={t('enterEmail')}
                                        type="email"
                                        {...field}
                                        value={(field.value as string) || ''}
                                        onChange={e => field.onChange(e.target.value)}
                                        data-testid="organization-member-email-input"
                                    />
                                </FormControl>
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
                                        <SelectTrigger data-testid="organization-member-role-select">
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
