// Three fraction digits cover the smallest allowed target (0.001).
export function formatObjectiveValue(value: number, locale: string): string {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(value);
}

// Stored dates are the UTC midnight of a calendar day, so they are formatted in UTC.
export function formatObjectiveDate(timestamp: number, locale: string): string {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(
        timestamp
    );
}

// Instants such as the completion time fall on the viewer's own calendar day.
export function formatInstantDate(timestamp: number, locale: string): string {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(timestamp);
}
