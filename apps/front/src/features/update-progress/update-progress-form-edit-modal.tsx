'use client';

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { CalendarIcon, PlusCircle } from 'lucide-react';
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
import { Textarea } from '@repo/ui/components/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/popover';
import { Calendar } from '@repo/ui/components/calendar';
import { cn } from '@repo/ui/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@repo/ui/components/dialog';
import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import { UpdateProgress, savedUpdateProgressSchema } from '@/features/update-progress/update-progress';
import { Id } from '@repo/backend/convex/_generated/dataModel';
import { useTranslations } from 'next-intl';

export default function UpdateProgressFormModal({
    defaultValues,
}: {
    defaultValues: UpdateProgress;
}) {
    const t = useTranslations('UpdateProgress');
    const tCommon = useTranslations('Common');
    const updateUpdateProgress = useMutation({
        mutationFn: useConvexMutation(api.update_progress.updateUpdateProgress),
    });
    const [open, setOpen] = useState(false);
    const form = useForm<z.infer<typeof savedUpdateProgressSchema>>({
        defaultValues: defaultValues,
        validators: {
            onChange: savedUpdateProgressSchema,
            onSubmit: savedUpdateProgressSchema,
        },
        onSubmit: async ({ value }: { value: UpdateProgress }) => {
            await onSubmit(value);
        },
    });

    const onSubmit = async (values: UpdateProgress) => {
        const updateData = {
            id: values._id as Id<'progressUpdates'>,
            updatedValue: values.updatedValue,
            updateDate: new Date(values.updateDate).getTime(),
            comment: values.comment ?? undefined,
        };

        await updateUpdateProgress.mutateAsync(updateData);

        setOpen(false);
        form.reset();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2" data-testid="progress-edit-open">
                    <PlusCircle className="h-4 w-4" />
                    {t('editProgress')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('editProgress')}</DialogTitle>
                    <DialogDescription>{t('editProgressDescription')}</DialogDescription>
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
                            name="updatedValue"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('updatedValue')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t('enterUpdatedValue')}
                                            type="number"
                                            data-testid="progress-edit-value-input"
                                            {...field}
                                            value={Number.isNaN(field.value) ? '' : field.value}
                                            onChange={e =>
                                                field.onChange(Number.parseFloat(e.target.value))
                                            }
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
                                            data-testid="progress-edit-comment-input"
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
                            <Button
                                variant="outline"
                                type="button"
                                data-testid="progress-edit-cancel-button"
                                onClick={() => setOpen(false)}
                            >
                                {tCommon('actions.cancel')}
                            </Button>
                            <Button type="submit" data-testid="progress-edit-save-button">
                                {t('saveProgress')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
