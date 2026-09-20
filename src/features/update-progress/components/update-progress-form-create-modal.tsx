'use client';

import type { Id } from '@/convex/_generated/dataModel';
import { requiredRouteParam } from '@/features/lib/route-param';

import { CalendarIcon, PlusCircle } from 'lucide-react';
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
import type { CreateUpdateProgress } from '@/features/update-progress/schemas/update-progress';
import { updateProgressSchema } from '@/features/update-progress/schemas/update-progress';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { formatCivilDate } from '@/lib/format-date';
import { useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import FormModal from '@/components/forms/form-modal';
import {
    currentUtcCivilDay,
    localDateToUtcCivilDay,
    utcCivilDayToLocalDate,
} from '@shared/civil-date';
export default function CreateUpdateProgressFormModal() {
    const t = useTranslations('UpdateProgress');
    const locale = useLocale();
    const params = useParams();
    const objectiveId = requiredRouteParam(params.id) as Id<'objectives'>;
    const [defaultUpdateDate] = useState(() => currentUtcCivilDay());
    const createUpdateProgress = useMutation({
        mutationFn: useConvexMutation(api.update_progress.createUpdateProgress),
    });
    return (
        <FormModal<CreateUpdateProgress>
            trigger={
                <Button className="gap-2" data-testid="progress-create-open">
                    <PlusCircle className="h-4 w-4" />
                    {t('createNewUpdateProgress')}
                </Button>
            }
            title={t('createNewUpdateProgress')}
            description={t('createNewUpdateProgressDescription')}
            formOptions={{
                defaultValues: {
                    comment: '',
                    updatedValue: 1,
                    updateDate: defaultUpdateDate,
                },
                validators: {
                    onChange: updateProgressSchema,
                    onSubmit: updateProgressSchema,
                },
            }}
            onSubmit={async (value: CreateUpdateProgress) => {
                await createUpdateProgress.mutateAsync({
                    objective: objectiveId,
                    updatedValue: value.updatedValue,
                    updateDate: value.updateDate,
                    comment: value.comment ?? undefined,
                });
            }}
            submitLabel={t('saveProgress')}
            cancelLabel={t('cancel')}
            isPending={createUpdateProgress.isPending}
            cancelTestId="progress-cancel-button"
            submitTestId="progress-save-button"
        >
            {form => (
                <>
                    <form.Field name="updatedValue">
                        {field => (
                            <FieldShell error={getFieldError(form, field)}>
                                <FormItem>
                                    <FormLabel>{t('updatedValue')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t('enterUpdatedValue')}
                                            type="number"
                                            data-testid="progress-value-input"
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
                            <FieldShell error={getFieldError(form, field)}>
                                <FormItem>
                                    <FormLabel>{t('comment')}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder={t('describeYourUpdateProgressInDetail')}
                                            className="resize-none min-h-[80px]"
                                            data-testid="progress-comment-input"
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
                            <FieldShell error={getFieldError(form, field)}>
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
