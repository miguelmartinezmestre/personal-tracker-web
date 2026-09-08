'use client';

import type { Id } from '@/convex/_generated/dataModel';
import { requiredRouteParam } from '@/features/lib/route-param';

import { CalendarIcon, PlusCircle } from 'lucide-react';
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
                                        data-testid="progress-value-input"
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
                                        data-testid="progress-comment-input"
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
                                                {Number.isFinite(Number(field.value)) ? (
                                                    formatCivilDate(Number(field.value), locale)
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
                                                Number.isFinite(Number(field.value))
                                                    ? utcCivilDayToLocalDate(Number(field.value))
                                                    : undefined
                                            }
                                            onSelect={date =>
                                                field.onChange(
                                                    date
                                                        ? localDateToUtcCivilDay(date)
                                                        : currentUtcCivilDay()
                                                )
                                            }
                                            disabled={date =>
                                                localDateToUtcCivilDay(date) > currentUtcCivilDay()
                                            }
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
