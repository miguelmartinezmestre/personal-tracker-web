const DEFAULT_SLUG_PREFIX = 'organization';

function stableStringHash(value: string): string {
    let hash = 0x811c9dc5;

    for (const character of value) {
        hash ^= character.codePointAt(0) ?? 0;
        hash = Math.imul(hash, 0x01000193);
    }

    return (hash >>> 0).toString(36);
}

export function buildOrganizationSlug(value: string): string {
    const trimmedValue = value.trim();

    const asciiSlug = trimmedValue
        .normalize('NFKD')
        .replace(/\p{M}+/gu, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    if (asciiSlug) {
        return asciiSlug;
    }

    return `${DEFAULT_SLUG_PREFIX}-${stableStringHash(trimmedValue || value)}`;
}

export function normalizeOrganizationName(name: string) {
    return name.trim().toLocaleLowerCase();
}
