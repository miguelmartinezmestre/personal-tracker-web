'use client';

import { requiredRouteParam } from '@/features/lib/route-param';

import type { z } from 'zod';
import { CalendarIcon, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    FieldShell,
    getFieldError,
    FormControl,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form-fields';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import type { UpdateProgress } from '@/features/update-progress/schemas/update-progress';
import { savedUpdateProgressSchema } from '@/features/update-progress/schemas/update-progress';
import { useLocale, useTranslations } from 'next-intl';
import { formatCivilDate } from '@/lib/format-date';
import FormModal from '@/components/forms/form-modal';
import {
    currentUtcCivilDay,
    localDateToUtcCivilDay,
    utcCivilDayToLocalDate,
} from '@shared/civil-date';
export default function UpdateProgressFormModal({
    defaultValues,
    objectiveId: _objectiveId,
}: {
    defaultValues: UpdateProgress;
    objectiveId: Id<'objectives'>;
}) {
    const t = useTranslations('UpdateProgress');
    const tCommon = useTranslations('Common');
    const locale = useLocale();
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
                    id: requiredRouteParam(value._id) as Id<'progressUpdates'>,
                    updatedValue: value.updatedValue,
                    updateDate: value.updateDate,
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
            {form => (
                <>
                    <form.Field name="updatedValue">
                        {field => (
                            <FieldShell name={field.name} error={getFieldError(form, field)}>
                                <FormItem>
                                    <FormLabel>{t('updatedValue')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t('enterUpdatedValue')}
                                            type="number"
                                            data-testid="progress-edit-value-input"
                                            name={field.name}
                                            value={
                                                typeof field.state.value === 'number' &&
                                                !Number.isNaN(field.state.value)
                                                    ? field.state.value
                                                    : ''
                                            }
                                            onChange={event =>
                                                field.handleChange(
                                                    Number.parseFloat(event.target.value)
                                                )
                                            }
                                            onBlur={field.handleBlur}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            </FieldShell>
                        )}
                    </form.Field>

                    <form.Field name="comment">
                        {field => (
                            <FieldShell name={field.name} error={getFieldError(form, field)}>
                                <FormItem>
                                    <FormLabel>{t('comment')}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder={t('describeYourUpdateProgressInDetail')}
                                            className="resize-none min-h-[80px]"
                                            data-testid="progress-edit-comment-input"
                                            name={field.name}
                                            value={
                                                typeof field.state.value === 'string'
                                                    ? field.state.value
                                                    : ''
                                            }
                                            onChange={event =>
                                                field.handleChange(event.target.value)
                                            }
                                            onBlur={field.handleBlur}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            </FieldShell>
                        )}
                    </form.Field>

                    <form.Field name="updateDate">
                        {field => (
                            <FieldShell name={field.name} error={getFieldError(form, field)}>
                                <FormItem className="flex flex-col">
                                    <FormLabel>{t('table.columns.date')}</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    onBlur={field.handleBlur}
                                                    className={cn(
                                                        'w-full pl-3 text-left font-normal',
                                                        !field.state.value &&
                                                            'text-muted-foreground'
                                                    )}
                                                >
                                                    {Number.isFinite(Number(field.state.value)) ? (
                                                        formatCivilDate(
                                                            Number(field.state.value),
                                                            locale
                                                        )
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
                                                    Number.isFinite(Number(field.state.value))
                                                        ? utcCivilDayToLocalDate(
                                                              Number(field.state.value)
                                                          )
                                                        : undefined
                                                }
                                                onSelect={date =>
                                                    field.handleChange(
                                                        date
                                                            ? localDateToUtcCivilDay(date)
                                                            : currentUtcCivilDay()
                                                    )
                                                }
                                                disabled={date =>
                                                    localDateToUtcCivilDay(date) >
                                                    currentUtcCivilDay()
                                                }
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            </FieldShell>
                        )}
                    </form.Field>
                </>
            )}
        </FormModal>
    );
}
