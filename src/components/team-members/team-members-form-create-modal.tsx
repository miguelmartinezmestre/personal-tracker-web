'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { CalendarIcon, PlusCircle } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
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
import { CreateUpdateProgress, CreateUpdateProgressBeforeCreate, updateProgressSchema } from '@/schemas/update-progress';
import { useParams } from 'next/navigation';
import { CreateTeamMember, teamMemberSchema } from '@/schemas/team-member';
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TeamRole } from '@/schemas/roles';

const roleOptions = [
    { value: TeamRole.MANAGER, label: 'Manager' },
    { value: TeamRole.MEMBER, label: 'Member' },
];


export default function CreateTeamMemberFormModal() {

    const { id: teamId } = useParams();

    const trpc = useTRPC();
    const queryClient = getQueryClient();
    const createTeamMember = useMutation(trpc.teamMembers.createTeamMember.mutationOptions());
    const [open, setOpen] = useState(false);
    const form = useForm<CreateTeamMember>({
        resolver: zodResolver(teamMemberSchema),
        defaultValues: {
            email: '',
            role: TeamRole.MEMBER,
            teamId: Number(teamId),
        },
    });

    const onSubmit = async (values: CreateTeamMember) => {
        console.log(values);
        const teamMember = await createTeamMember.mutateAsync(values);

        queryClient.invalidateQueries(trpc.teamMembers.getTeamMembersByTeamId.queryOptions({ teamId: teamMember.teamId! }));
        setOpen(false);
        form.reset();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <PlusCircle className="h-4 w-4" />
                    Create New Team Member
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Team Member</DialogTitle>
                    <DialogDescription>
                        Fill out the form below to create a new team member. Click save when you're
                        done.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter email"
                                            type="email"
                                            {...field}
                                            value={field.value || ''}
                                            onChange={e => field.onChange(e.target.value)}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Give your team member a clear, concise email.
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
                                    <FormLabel>Role</FormLabel>
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
                                        Current role of your team member.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="pt-4">
                            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">Save Team Member</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
