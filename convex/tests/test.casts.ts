import type { Id, TableNames } from '../_generated/dataModel';

export function asTestId<Table extends TableNames>(value: string): Id<Table> {
    // Branded ID for invalid-input tests; this does not validate a stored identifier.
    return value as Id<Table>;
}

export function asInvalidArg<TExpected>(
    value: TExpected | string | number | boolean | null | object
): TExpected {
    // Intentionally invalid payload for backend boundary tests.
    return value as TExpected;
}
