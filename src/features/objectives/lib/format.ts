export function formatObjectiveValue(value: number, locale: string): string {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(value);
}

// Stored dates are the UTC midnight of a calendar day, so they are formatted in UTC.
export function formatObjectiveDate(
    timestamp: number,
    locale: string,
    dateStyle: 'medium' | 'full' = 'medium'
): string {
    return new Intl.DateTimeFormat(locale, { dateStyle, timeZone: 'UTC' }).format(timestamp);
}

export function formatDifference(value: number, locale: string): string {
    return new Intl.NumberFormat(locale, {
        maximumFractionDigits: 3,
        signDisplay: 'exceptZero',
    }).format(value);
}

export function formatInstantDate(timestamp: number, locale: string): string {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(timestamp);
}

export function formatProgressPercent(percent: number, locale: string): string {
    return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(
        percent / 100
    );
}
