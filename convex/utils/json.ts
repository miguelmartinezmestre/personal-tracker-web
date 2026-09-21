type JsonPrimitive = string | number | boolean | null;
export type JsonObject = { readonly [key: string]: JsonValue };
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];

export function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isJsonValue(value: unknown, seen: Set<object>, depth: number): value is JsonValue {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') {
        return true;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value);
    }
    if (typeof value !== 'object' || depth > 64 || seen.has(value)) {
        return false;
    }
    if (
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) !== Object.prototype &&
        Object.getPrototypeOf(value) !== null
    ) {
        return false;
    }
    seen.add(value);
    const valid = Object.values(value).every(item => isJsonValue(item, seen, depth + 1));
    seen.delete(value);
    return valid;
}

export function isJsonObject(value: unknown): value is JsonObject {
    return isRecord(value) && isJsonValue(value, new Set(), 0);
}

export function getOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
}

export function parseJsonValue(text: string): JsonValue {
    const parsed: unknown = JSON.parse(text);
    if (!isJsonValue(parsed, new Set(), 0)) {
        throw new Error('Invalid JSON value');
    }
    return parsed;
}
