type DateInput = number | string | Date;

export function formatDate(value: DateInput, locale: string): string {
    return new Intl.DateTimeFormat(locale).format(new Date(value));
}

export function formatCivilDate(value: DateInput, locale: string): string {
    return new Intl.DateTimeFormat(locale, { timeZone: 'UTC' }).format(new Date(value));
}

export function formatTime(value: DateInput, locale: string): string {
    return new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(new Date(value));
}
