export function requiredRouteParam(value: string | readonly string[] | undefined): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error('Invalid route parameter');
    }
    return value;
}

export function optionalRouteParam(value: string | null | undefined): string | undefined {
    return value?.trim() || undefined;
}
