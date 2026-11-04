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

// The user's local day as its UTC midnight, like deadlines; the UTC day differs around midnight.
export function todayTimestamp(): number {
    const now = new Date();

    return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

export function todayDateInput(): string {
    return timestampToDateInput(todayTimestamp());
}

export function isOverdue(objective: { status: string; deadline?: number }): boolean {
    return (
        objective.status === 'active' &&
        objective.deadline !== undefined &&
        timestampToDateInput(objective.deadline) < todayDateInput()
    );
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysUntil(deadline: number): number {
    return Math.round((deadline - todayTimestamp()) / DAY_MS);
}

export type ObjectivePace = 'onTrack' | 'atRisk' | 'overdue';

type PaceStart = { createdAt: number; firstProgressAt?: number | undefined };

// The ideal pace starts at creation, or the day before the first progress dated earlier.
export function paceStartDate({ createdAt, firstProgressAt }: PaceStart): number {
    return firstProgressAt !== undefined && firstProgressAt <= createdAt
        ? firstProgressAt - DAY_MS
        : createdAt;
}

type PacedObjective = PaceStart & {
    status: string;
    direction: 'increase' | 'decrease';
    deadline?: number;
    startValue: number;
    currentValue: number;
    targetValue: number;
};

export function objectivePace(objective: PacedObjective): ObjectivePace | undefined {
    if (objective.status !== 'active' || objective.deadline === undefined) {
        return undefined;
    }

    if (isOverdue(objective)) {
        return 'overdue';
    }

    const start = paceStartDate(objective);
    const span = objective.deadline - start;

    const elapsed = span > 0 ? Math.min(1, Math.max(0, (todayTimestamp() - start) / span)) : 1;

    const expected =
        objective.startValue + (objective.targetValue - objective.startValue) * elapsed;

    const isOnTrack =
        objective.direction === 'increase'
            ? objective.currentValue >= expected
            : objective.currentValue <= expected;

    return isOnTrack ? 'onTrack' : 'atRisk';
}
