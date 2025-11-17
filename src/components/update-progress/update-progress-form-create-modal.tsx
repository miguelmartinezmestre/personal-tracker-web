'use client';

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
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
import { useMutation } from '@tanstack/react-query';
import { CreateUpdateProgress, updateProgressSchema } from '@/schemas/update-progress';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useConvexMutation } from '@convex-dev/react-query';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

export default function CreateUpdateProgressFormModal() {
    const t = useTranslations('UpdateProgress');

    const { id: objectiveId } = useParams();

    const createUpdateProgress = useMutation({ mutationFn: useConvexMutation(api.update_progress.createUpdateProgress) });
    const [open, setOpen] = useState(false);
    const form = useForm<CreateUpdateProgress>({
        defaultValues: {
            comment: '',
            updatedValue: 0,
            updateDate: new Date(),
        },
        validators: {
            onChange: updateProgressSchema,
            onSubmit: updateProgressSchema,
        },
        onSubmit: async ({ value }: { value: CreateUpdateProgress }) => {
            await onSubmit(value);
        },
    });

    const onSubmit = async (values: CreateUpdateProgress) => {
        await createUpdateProgress.mutateAsync({
            objective: objectiveId as Id<'objectives'>,
            updatedValue: Number(values.updatedValue),
            updateDate: new Date(values.updateDate).getTime(),
            comment: values.comment ?? undefined,
        });
        setOpen(false);
        form.reset();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <PlusCircle className="h-4 w-4" />
                    {t('createNewUpdateProgress')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('createNewUpdateProgress')}</DialogTitle>
                    <DialogDescription>
                        {t('createNewUpdateProgressDescription')}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="space-y-5 py-4">
                        <FormField
                            name="updatedValue"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('updatedValue')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('enterUpdatedValue')}
                                            type="number"
                                            {...field}
                                            value={Number.isNaN(field.value) ? '' : field.value}
                                            onChange={e => field.onChange(Number.parseFloat(e.target.value))}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        {t('giveYourUpdateProgressAClearConciseTitle')}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            name="comment"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('comment')}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder={t('describeYourUpdateProgressInDetail')}
                                            className="resize-none min-h-[80px]"
                                            {...field}
                                            value={field.value || ''}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        {t('optionalAddDetailsAboutYourUpdateProgress')}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />



                        <FormField
                            name="updateDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>{t('deadline')}</FormLabel>
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
                                                        <span>{t('pickADate')}</span>
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
                                {t('cancel')}
                            </Button>
                            <Button type="submit" disabled={createUpdateProgress.isPending}>{t('saveProgress')}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
