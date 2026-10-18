export function average(sum: number, count: number): number {
    return count === 0 ? 0 : Math.round(sum / count);
}
