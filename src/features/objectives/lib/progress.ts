export function roundValue(value: number): number {
    return Number(value.toPrecision(15));
}

// Subtracting decimals leaves 15th-digit noise (88 - 85.1 = 2.9000000000000057), so 12 are kept.
export function progressDifference(
    mode: 'difference' | 'value',
    amount: number,
    baseValue: number
): number {
    return mode === 'difference' ? amount : Number((amount - baseValue).toPrecision(12));
}
