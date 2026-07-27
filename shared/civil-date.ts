export const CIVIL_DAY_MS = 24 * 60 * 60 * 1000;

/** Canonical date-only representation: UTC midnight for its UTC calendar day. */
export function toUtcCivilDay(timestamp: number): number {
    const date = new Date(timestamp);
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Converts a date selected in the browser's local calendar into a UTC day key. */
export function localDateToUtcCivilDay(date: Date): number {
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Converts a UTC day key into a local Date that selects the same calendar cell. */
export function utcCivilDayToLocalDate(timestamp: number): Date {
    const date = new Date(timestamp);
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function currentUtcCivilDay(now = Date.now()): number {
    return toUtcCivilDay(now);
}

/** Exclusive instant at which a deadline's civil day has fully elapsed. */
export function deadlineEndExclusive(deadline: number): number {
    return toUtcCivilDay(deadline) + CIVIL_DAY_MS;
}
