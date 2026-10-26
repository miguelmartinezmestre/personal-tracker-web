import * as english from 'chrono-node/en';
import * as spanish from 'chrono-node/es';

const SPANISH_UNIT_DAYS: Record<string, number> = { d: 1, s: 7 };

// chrono's Spanish locale knows "mañana" and "dentro de 3 días" but not these everyday forms.
const spanishParser = spanish.casual.clone();

spanishParser.parsers.push(
    {
        pattern: () => /\bpasado\s+mañana\b/i,
        extract: context => shiftedDay(context.refDate, 2),
    },
    {
        pattern: () => /\banteayer\b/i,
        extract: context => shiftedDay(context.refDate, -2),
    },
    {
        pattern: () => /\bhace\s+(\d+|una?)\s+(d[ií]as?|semanas?|mes(?:es)?|años?)\b/i,
        extract: (context, match) => {
            const amount = Number(match[1]) || 1;
            const unit = (match[2] ?? '').toLowerCase();
            const date = new Date(context.refDate);

            if (unit.startsWith('mes')) {
                date.setMonth(date.getMonth() - amount);
            } else if (unit.startsWith('a')) {
                date.setFullYear(date.getFullYear() - amount);
            } else {
                date.setDate(date.getDate() - amount * (SPANISH_UNIT_DAYS[unit.charAt(0)] ?? 1));
            }

            return calendarDay(date);
        },
    }
);

function calendarDay(date: Date) {
    return { day: date.getDate(), month: date.getMonth() + 1, year: date.getFullYear() };
}

function shiftedDay(reference: Date, days: number) {
    const date = new Date(reference);
    date.setDate(date.getDate() + days);

    return calendarDay(date);
}

export function localDateToInput(date: Date): string {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-');
}

export function dateInputToLocalDate(value: string): Date | undefined {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : undefined;
}

export function parseDateText(
    text: string,
    locale: string,
    options: { now?: Date; forwardDate?: boolean } = {}
): string | undefined {
    const trimmed = text.trim();
    const parser = locale === 'es' ? spanishParser : english.casual;

    const [result] = parser.parse(trimmed, options.now ?? new Date(), {
        forwardDate: options.forwardDate,
    });

    if (!result || result.index !== 0 || result.text.length !== trimmed.length) {
        return undefined;
    }

    return localDateToInput(result.start.date());
}

export function formatDateText(value: string, locale: string): string {
    const date = dateInputToLocalDate(value);

    return date
        ? new Intl.DateTimeFormat(locale, {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
          }).format(date)
        : '';
}
