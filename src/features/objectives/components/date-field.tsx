'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { enUS, es } from 'react-day-picker/locale';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
    dateInputToLocalDate,
    formatDateText,
    localDateToInput,
    parseDateText,
} from '@/features/objectives/lib/date-text';
import { formatObjectiveDate } from '@/features/objectives/lib/format';
import { dateInputToUtcTimestamp } from '@/features/objectives/lib/dates';

type Draft = { text: string; value: string; month: Date };

export function DateField({
    id,
    value,
    onChange,
    onBlur,
    min,
    max,
    required = false,
    forwardDate = false,
    isInvalid,
    testId,
}: {
    id: string;
    value: string;
    onChange: (value: string) => void;
    onBlur: () => void;
    min?: string;
    max?: string;
    required?: boolean;
    forwardDate?: boolean;
    isInvalid: boolean;
    testId: string;
}) {
    const t = useTranslations('Objectives.dateField');
    const locale = useLocale();
    const selected = dateInputToLocalDate(value);

    const [draft, setDraft] = useState<Draft>(() => ({
        text: formatDateText(value, locale),
        value,
        month: selected ?? new Date(),
    }));

    const current =
        draft.value === value
            ? draft
            : { text: formatDateText(value, locale), value, month: selected ?? new Date() };

    const change = (text: string, next: string, month = dateInputToLocalDate(next)) => {
        setDraft({ text, value: next, month: month ?? current.month });
        onChange(next);
    };

    const minDate = min ? dateInputToLocalDate(min) : undefined;
    const maxDate = max ? dateInputToLocalDate(max) : undefined;
    const timestamp = dateInputToUtcTimestamp(value);

    let reading = t('hint');

    if (timestamp !== undefined) {
        reading = t('understood', { date: formatObjectiveDate(timestamp, locale, 'full') });
    } else if (current.text.trim()) {
        reading = t('notUnderstood');
    }

    return (
        <div className="space-y-2">
            <Input
                id={id}
                value={current.text}
                placeholder={t('placeholder')}
                autoComplete="off"
                onBlur={onBlur}
                onChange={event => {
                    const text = event.target.value;
                    const parsed = parseDateText(text, locale, { forwardDate });

                    change(text, text.trim() ? (parsed ?? text) : '');
                }}
                aria-invalid={isInvalid}
                aria-describedby={`${id}-reading`}
                data-testid={testId}
            />
            <p
                id={`${id}-reading`}
                className="text-muted-foreground text-sm"
                aria-live="polite"
                data-testid={`${testId}-reading`}
            >
                {reading}
            </p>
            <Calendar
                mode="single"
                selected={selected}
                month={current.month}
                onMonthChange={month => setDraft({ ...current, month })}
                onSelect={(day: Date | undefined) => {
                    if (!day && required) {
                        return;
                    }

                    const next = day ? localDateToInput(day) : '';

                    change(formatDateText(next, locale), next);
                }}
                disabled={[
                    ...(minDate ? [{ before: minDate }] : []),
                    ...(maxDate ? [{ after: maxDate }] : []),
                ]}
                locale={locale === 'es' ? es : enUS}
                className="rounded-md border"
                data-testid={`${testId}-calendar`}
            />
        </div>
    );
}
