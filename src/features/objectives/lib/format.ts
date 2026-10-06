// Three fraction digits cover the smallest allowed target (0.001).
export function formatObjectiveValue(value: number, locale: string): string {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(value);
}
