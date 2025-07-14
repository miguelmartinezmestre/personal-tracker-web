'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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
import { UpdateProgress, savedUpdateProgressSchema } from '@/schemas/update-progress';

export default function UpdateProgressFormModal({ defaultValues }: { defaultValues: UpdateProgress }) {

    const trpc = useTRPC()
    const updateUpdateProgress = useMutation(trpc.updateProgress.updateUpdateProgress.mutationOptions());
    const [open, setOpen] = useState(false);
    const form = useForm<z.infer<typeof savedUpdateProgressSchema>>({
        resolver: zodResolver(savedUpdateProgressSchema),
        defaultValues: defaultValues,
    });

    const queryClient = getQueryClient();

    const onSubmit = async (values: UpdateProgress) => {
        const updateData = {
            id: values.id,
            updatedValue: values.updatedValue,
            updateDate: values.updateDate,
            comment: values.comment ?? null,
            objectiveId: values.objectiveId,
        };

        console.log(updateData);

        await updateUpdateProgress.mutateAsync(updateData);

        queryClient.invalidateQueries(trpc.updateProgress.getUpdateProgressByObjectiveId.queryOptions({ id: updateData.objectiveId! }));

        setOpen(false);
        form.reset();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <PlusCircle className="h-4 w-4" />
                    Edit Progress
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Progress</DialogTitle>
                    <DialogDescription>
                        Fill out the form below to edit your progress. Click save when you&apos;re
                        done.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4">
                        <FormField
                            control={form.control}
                            name="updatedValue"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Updated Value</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter updated value"
                                            type="number"
                                            {...field}
                                            value={Number.isNaN(field.value) ? '' : field.value}
                                            onChange={e => field.onChange(Number.parseFloat(e.target.value))}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Give your update progress a clear, concise title.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="comment"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Comment</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Describe your update progress in detail"
                                            className="resize-none min-h-[80px]"
                                            {...field}
                                            value={field.value || ''}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Optional: Add details about your update progress.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />



                        <FormField
                            control={form.control}
                            name="updateDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Deadline</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={'outline'}
                                                    className={cn(
                                                        'w-full pl-3 text-left font-normal',
                                                        !field.value && 'text-muted-foreground'
                                                    )}
                                                >
                                                    {field.value ? (
                                                        new Date(field.value).toLocaleDateString()
                                                    ) : (
                                                        <span>Pick a date</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value || undefined}
                                                onSelect={field.onChange}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />



                        <DialogFooter className="pt-4">
                            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">Save Progress</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
