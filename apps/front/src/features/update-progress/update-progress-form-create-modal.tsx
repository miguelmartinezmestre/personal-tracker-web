'use client';

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
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
import { useMutation, useQuery } from '@tanstack/react-query';
import { CreateUpdateProgress, updateProgressSchema } from '@/features/update-progress/update-progress';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useConvexMutation } from '@convex-dev/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import { Doc, Id } from '@repo/backend/convex/_generated/dataModel';

export default function CreateUpdateProgressFormModal() {
    const t = useTranslations('UpdateProgress');

    const { id: objectiveId } = useParams();

    const createUpdateProgress = useMutation({
        mutationFn: useConvexMutation(api.update_progress.createUpdateProgress),
    });
    const objective = useQuery(
        convexQuery(api.objectives.getObjectiveById, { id: objectiveId as Id<'objectives'> })
    );
    const [open, setOpen] = useState(false);
    const objectiveDoc = objective.data as
        | (Doc<'objectives'> & { objectiveType?: string; unit?: string })
        | undefined;
    const objectiveType = objectiveDoc?.objectiveType ?? 'value';
    const unitLabel = objectiveDoc?.unit ? ` (${objectiveDoc.unit})` : '';
    const updatedValueLabel =
        objectiveType === 'count'
            ? t('valueLabels.count')
            : objectiveType === 'money'
                ? t('valueLabels.money')
                : objectiveType === 'duration'
                    ? t('valueLabels.duration')
                    : t('valueLabels.value');
    const updatedValuePlaceholder =
        objectiveType === 'count'
            ? t('valuePlaceholders.count')
            : objectiveType === 'money'
                ? t('valuePlaceholders.money')
                : objectiveType === 'duration'
                    ? t('valuePlaceholders.duration')
                    : t('valuePlaceholders.value');
    const form = useForm<CreateUpdateProgress>({
        defaultValues: {
            comment: '',
            updatedValue: 1,
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
                <Button className="gap-2" data-testid="progress-create-open">
                    <PlusCircle className="h-4 w-4" />
                    {t('createNewUpdateProgress')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('createNewUpdateProgress')}</DialogTitle>
                    <DialogDescription>{t('createNewUpdateProgressDescription')}</DialogDescription>
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
                                    <FormLabel>{updatedValueLabel}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={updatedValuePlaceholder}
                                            type="number"
                                            data-testid="progress-value-input"
                                            {...field}
                                            value={Number.isNaN(field.value) ? '' : field.value}
                                            onChange={e =>
                                                field.onChange(Number.parseFloat(e.target.value))
                                            }
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        {t('valueDescription', {
                                            unit: unitLabel,
                                        })}
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
                                            data-testid="progress-comment-input"
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
                                data-testid="progress-cancel-button"
                                onClick={() => setOpen(false)}
                            >
                                {t('cancel')}
                            </Button>
                            <Button
                                type="submit"
                                data-testid="progress-save-button"
                                disabled={createUpdateProgress.isPending}
                            >
                                {t('saveProgress')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
