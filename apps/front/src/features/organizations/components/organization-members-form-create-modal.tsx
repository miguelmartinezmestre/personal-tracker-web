'use client';

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { PlusCircle } from 'lucide-react';
import { Button } from '@repo/ui/components/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@repo/ui/components/form-tanstack';
import { Input } from '@repo/ui/components/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@repo/ui/components/dialog';
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
} from '@repo/ui/components/select';
import { useTranslations } from 'next-intl';
import { useCreateOrganizationMember } from '@/features/organizations/hooks/use-organization-members';
import { OrganizationRole } from '../types/roles';

interface CreateOrganizationMemberFormModalProps {
    organizationId: string;
}

export default function CreateOrganizationMemberFormModal({
    organizationId,
}: CreateOrganizationMemberFormModalProps) {
    const t = useTranslations('OrganizationMembers');
    const createOrganizationMember = useCreateOrganizationMember();

    const roleOptions = [
        { value: OrganizationRole.OWNER, label: t('roles.owner') },
        { value: OrganizationRole.MEMBER, label: t('roles.member') },
    ];

    const [open, setOpen] = useState(false);
    const form = useForm<CreateOrganizationMember>({
        defaultValues: {
            email: '',
            role: 'member',
            organizationId: organizationId,
        },
        validators: {
            onChange: organizationMemberSchema,
            onSubmit: organizationMemberSchema,
        },
        onSubmit: async ({ value }: { value: CreateOrganizationMember }) => {
            await onSubmit(value);
        },
    });

    const onSubmit = async (values: CreateOrganizationMember) => {
        await createOrganizationMember.mutateAsync({
            organizationId: organizationId,
            email: values.email,
            role: values.role as OrganizationRole,
        });
        setOpen(false);
        form.reset();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2" data-testid="organization-member-create-open">
                    <PlusCircle className="h-4 w-4" />
                    {t('createNewOrganizationMember')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('createNewOrganizationMember')}</DialogTitle>
                    <DialogDescription>
                        {t('createNewOrganizationMemberDescription')}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={e => {
                            e.preventDefault();
                            form.handleSubmit();
                        }}
                        className="space-y-5 py-4"
                    >
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
                                            value={field.value || ''}
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
                                        value={field.value || 'member'}
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
                        <DialogFooter className="pt-4">
                            <Button
                                variant="outline"
                                type="button"
                                onClick={() => setOpen(false)}
                                data-testid="organization-member-cancel-button"
                            >
                                {t('cancel')}
                            </Button>
                            <Button type="submit" data-testid="organization-member-save-button">
                                {t('saveOrganizationMember')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
