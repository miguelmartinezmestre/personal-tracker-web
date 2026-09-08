'use client';
import { CalendarIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { formatCivilDate } from '@/lib/format-date';
import { Button } from '@/components/ui/button';
import {
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form-tanstack';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { OBJECTIVE_VISIBILITY } from '@/convex/utils/constants';
import { localDateToUtcCivilDay, utcCivilDayToLocalDate } from '@shared/civil-date';
type ObjectiveVisibilityAndDeadlineFieldsProps = {
    mode: 'create' | 'edit';
    visibilityLabel: string;
    visibilityDescription: string;
    deadlineLabel: string;
    visibilityTestId: string;
    deadlineTestId: string;
};
function isVisibilityValue(
    value: string
): value is (typeof OBJECTIVE_VISIBILITY)[keyof typeof OBJECTIVE_VISIBILITY] {
    return value === OBJECTIVE_VISIBILITY.PRIVATE || value === OBJECTIVE_VISIBILITY.ORGANIZATION;
}
export function ObjectiveVisibilityAndDeadlineFields({
    mode,
    visibilityLabel,
    visibilityDescription,
    deadlineLabel,
    visibilityTestId,
    deadlineTestId,
}: ObjectiveVisibilityAndDeadlineFieldsProps) {
    const t = useTranslations('Objectives');
    const locale = useLocale();
    return (
        <>
            {mode === 'create' ? (
                <FormField
                    name="visibility"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{visibilityLabel}</FormLabel>
                            <Select
                                onValueChange={value => {
                                    if (isVisibilityValue(value)) {
                                        field.onChange(value);
                                    }
                                }}
                                value={
                                    typeof field.value === 'string'
                                        ? field.value
                                        : OBJECTIVE_VISIBILITY.PRIVATE
                                }
                            >
                                <FormControl>
                                    <SelectTrigger data-testid={visibilityTestId}>
                                        <SelectValue />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value={OBJECTIVE_VISIBILITY.PRIVATE}>
                                        {t('visibility.private')}
                                    </SelectItem>
                                    <SelectItem value={OBJECTIVE_VISIBILITY.ORGANIZATION}>
                                        {t('visibility.organization')}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <FormDescription>{visibilityDescription}</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            ) : null}

            <FormField
                name="deadline"
                render={({ field }) => {
                    const deadline = typeof field.value === 'number' ? field.value : undefined;
                    return (
                        <FormItem className="flex flex-col">
                            <FormLabel>{deadlineLabel}</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                'w-full pl-3 text-left font-normal',
                                                !deadline && 'text-muted-foreground'
                                            )}
                                            data-testid={deadlineTestId}
                                        >
                                            {deadline ? (
                                                formatCivilDate(deadline, locale)
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
                                            deadline ? utcCivilDayToLocalDate(deadline) : undefined
                                        }
                                        onSelect={value =>
                                            field.onChange(
                                                value ? localDateToUtcCivilDay(value) : null
                                            )
                                        }
                                    />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    );
                }}
            />
        </>
    );
}
