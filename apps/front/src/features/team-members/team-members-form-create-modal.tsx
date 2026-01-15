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
import { CreateTeamMember, teamMemberSchema } from '@/schemas/team-member';
import {
    Select,
    SelectItem,
    SelectContent,
    SelectTrigger,
    SelectValue,
} from '@repo/ui/components/select';
import { TeamRole } from '@/schemas/roles';
import { useTranslations } from 'next-intl';
import { useCreateTeamMember } from '@/features/team-members/use-team-members';

interface CreateTeamMemberFormModalProps {
    teamId: string;
}

export default function CreateTeamMemberFormModal({ teamId }: CreateTeamMemberFormModalProps) {
    const t = useTranslations('TeamMembers');
    const createTeamMember = useCreateTeamMember();

    const roleOptions = [
        { value: TeamRole.OWNER, label: t('roles.owner') },
        { value: TeamRole.ADMIN, label: t('roles.admin') },
        { value: TeamRole.MEMBER, label: t('roles.member') },
    ];

    const [open, setOpen] = useState(false);
    const form = useForm<CreateTeamMember>({
        defaultValues: {
            email: '',
            role: 'member',
            organizationId: teamId,
        },
        validators: {
            onChange: teamMemberSchema,
            onSubmit: teamMemberSchema,
        },
        onSubmit: async ({ value }: { value: CreateTeamMember }) => {
            await onSubmit(value);
        },
    });

    const onSubmit = async (values: CreateTeamMember) => {
        await createTeamMember.mutateAsync({
            organizationId: teamId,
            email: values.email,
            role: values.role,
        });
        setOpen(false);
        form.reset();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <PlusCircle className="h-4 w-4" />
                    {t('createNewTeamMember')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('createNewTeamMember')}</DialogTitle>
                    <DialogDescription>{t('createNewTeamMemberDescription')}</DialogDescription>
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
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        {t('giveYourTeamMemberAClearConciseEmail')}
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
                                            <SelectTrigger>
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
                                        {t('currentRoleOfYourTeamMember')}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="pt-4">
                            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                                {t('cancel')}
                            </Button>
                            <Button type="submit">{t('saveTeamMember')}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
