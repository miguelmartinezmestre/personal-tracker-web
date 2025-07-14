'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { useTRPC } from '@/trpc/client';
import { useMutation } from '@tanstack/react-query';
import { getQueryClient } from '@/trpc/client';
import { TeamMember, savedTeamMemberSchema } from '@/schemas/team-member';
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TeamRole } from '@/schemas/roles';
import { useTranslations } from 'next-intl';

const roleOptions = [
    { value: TeamRole.MANAGER, label: 'Manager' },
    { value: TeamRole.MEMBER, label: 'Member' },
];

export default function TeamMemberEditFormModal({ defaultValues }: { defaultValues: TeamMember }) {

    const t = useTranslations('TeamMembers');
    const trpc = useTRPC()
    const updateTeamMember = useMutation(trpc.teamMembers.updateTeamMember.mutationOptions());
    const [open, setOpen] = useState(false);
    const form = useForm<TeamMember>({
        resolver: zodResolver(savedTeamMemberSchema),
        defaultValues: defaultValues,
    });

    const queryClient = getQueryClient();

    const onSubmit = async (values: TeamMember) => {
        const updateData = {
            id: values.id,
            email: values.email,
            role: values.role,
            teamId: values.teamId,
        };

        console.log(updateData);

        await updateTeamMember.mutateAsync(updateData);

        queryClient.invalidateQueries(trpc.teamMembers.getTeamMembersByTeamId.queryOptions({ teamId: updateData.teamId! }));

        setOpen(false);
        form.reset();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <PlusCircle className="h-4 w-4" />
                    {t('edit')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('edit')}</DialogTitle>
                    <DialogDescription>
                        {t('editTeamMemberDescription')}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('email')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('enterEmail')}
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
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('role')}</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value || TeamRole.MEMBER}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a role" />
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
