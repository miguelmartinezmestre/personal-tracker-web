export function dateInputToUtcTimestamp(value: string): number | undefined {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
        return undefined;
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const timestamp = Date.UTC(year, month - 1, day);
    const check = new Date(timestamp);
    if (
        check.getUTCFullYear() !== year ||
        check.getUTCMonth() !== month - 1 ||
        check.getUTCDate() !== day
    ) {
        return undefined;
    }
    return timestamp;
}

export function timestampToDateInput(timestamp: number | undefined): string {
    if (timestamp === undefined) {
        return '';
    }
    return new Date(timestamp).toISOString().slice(0, 10);
}

// "Today" is the user's local calendar day; the UTC day differs around midnight.
export function todayDateInput(): string {
    const now = new Date();
    return timestampToDateInput(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

// A deadline set to today is still on time; it is overdue from the next local day.
export function isOverdue(objective: { status: string; deadline?: number }): boolean {
    return (
        objective.status === 'active' &&
        objective.deadline !== undefined &&
        timestampToDateInput(objective.deadline) < todayDateInput()
    );
}
