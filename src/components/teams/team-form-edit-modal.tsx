'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
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
import { Team, savedTeamSchema } from '@/schemas/team';


export default function EditTeamFormModal({defaultValues}: {defaultValues: Team}) {

    const trpc = useTRPC()
    const updateTeam = useMutation(trpc.teams.updateTeam.mutationOptions());
    const [open, setOpen] = useState(false);
    const form = useForm<z.infer<typeof savedTeamSchema>>({
        resolver: zodResolver(savedTeamSchema),
        defaultValues: defaultValues,
    });

    const queryClient = getQueryClient();

    const onSubmit = async (values: Team) => {
        const updateData = {
            id: values.id,
            name: values.name,
            description: values.description ?? undefined,
        };

        console.log(updateData);

        await updateTeam.mutateAsync(updateData);

        queryClient.invalidateQueries(trpc.teams.getTeams.queryOptions({}));

        setOpen(false);
        form.reset();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <PlusCircle className="h-4 w-4" />
                    Edit Team
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit team</DialogTitle>
                    <DialogDescription>
                        Fill out the form below to edit your team. Click save when you're
                        done.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter team name" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        Give your team a clear, concise name.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Describe your team in detail"
                                            className="resize-none min-h-[80px]"
                                            {...field}
                                            value={field.value || ''}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Optional: Add details about your team.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
                            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">Save team</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
