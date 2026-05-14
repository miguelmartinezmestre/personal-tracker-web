export function isVitestRuntime(): boolean {
    return process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';
}
