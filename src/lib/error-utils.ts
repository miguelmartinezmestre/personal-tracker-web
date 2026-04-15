export function getMessageOrFallback(message: string | undefined | null, fallback: string): string {
    if (message) return message;
    return fallback;
}

export function getErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof Error) return err.message;
    return fallback;
}

export function emptyToUndefined(value: string | undefined | null): string | undefined {
    if (value) return value;
    return undefined;
}
