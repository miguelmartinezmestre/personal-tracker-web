// Same 15-digit rounding as the stored totals, so 0.7 + 0.1 lands exactly on 0.8.
export function roundValue(value: number): number {
    return Number(value.toPrecision(15));
}

// A "new value" entry is stored as its difference from the value it replaces. Subtracting
// decimals leaves noise in the 15th digit (88 - 85.1 = 2.9000000000000057), so 12 are kept.
export function progressDifference(
    mode: 'difference' | 'value',
    amount: number,
    baseValue: number
): number {
    return mode === 'difference' ? amount : Number((amount - baseValue).toPrecision(12));
}
