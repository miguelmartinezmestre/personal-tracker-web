'use client';

import { z } from 'zod';
import { CalendarIcon, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form-tanstack';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/ui-utils/utils';
import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import {
    UpdateProgress,
    savedUpdateProgressSchema,
} from '@/features/update-progress/schemas/update-progress';
import { Id } from '@/convex/_generated/dataModel';
import { useTranslations } from 'next-intl';
import FormModal from '@/components/form-modal';

export default function UpdateProgressFormModal({
    defaultValues,
    objectiveId: _objectiveId,
}: {
    defaultValues: UpdateProgress;
    objectiveId: Id<'objectives'>;
}) {
    const t = useTranslations('UpdateProgress');
    const tCommon = useTranslations('Common');

    const updateUpdateProgress = useMutation({
        mutationFn: useConvexMutation(api.update_progress.updateUpdateProgress),
    });

    return (
        <FormModal<z.infer<typeof savedUpdateProgressSchema>>
            trigger={
                <Button className="gap-2" data-testid="progress-edit-open">
                    <Pencil className="h-4 w-4" />
                    {t('editProgress')}
                </Button>
            }
            title={t('editProgress')}
            description={t('editProgressDescription')}
            formOptions={{
                defaultValues,
                validators: {
                    onChange: savedUpdateProgressSchema,
                    onSubmit: savedUpdateProgressSchema,
                },
            }}
            onSubmit={async value => {
                await updateUpdateProgress.mutateAsync({
                    id: value._id as Id<'progressUpdates'>,
                    updatedValue: value.updatedValue,
                    updateDate: new Date(value.updateDate).getTime(),
                    comment: value.comment ?? undefined,
                });
            }}
            submitLabel={t('saveProgress')}
            pendingLabel={tCommon('loading')}
            cancelLabel={tCommon('actions.cancel')}
            isPending={updateUpdateProgress.isPending}
            cancelTestId="progress-edit-cancel-button"
            submitTestId="progress-edit-save-button"
        >
            {() => (
                <>
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
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        name="updateDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>{t('table.columns.date')}</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    'w-full pl-3 text-left font-normal',
                                                    !field.value && 'text-muted-foreground'
                                                )}
                                            >
                                                {field.value &&
                                                (typeof field.value === 'string' ||
                                                    typeof field.value === 'number') ? (
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
                                            selected={
                                                field.value &&
                                                (typeof field.value === 'string' ||
                                                    typeof field.value === 'number')
                                                    ? new Date(field.value)
                                                    : undefined
                                            }
                                            onSelect={field.onChange}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </>
            )}
        </FormModal>
    );
}
