export function getMessageOrFallback(message: string | undefined | null, fallback: string): string {
    if (message) return message;
    return fallback;
}

export function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error) return error.message;
    return fallback;
}

export function emptyToUndefined(value: string | undefined | null): string | undefined {
    if (value) return value;
    return undefined;
}
