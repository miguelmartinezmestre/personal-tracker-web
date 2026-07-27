const DEFAULT_SLUG_PREFIX = 'organization';
const MAX_SLUG_LENGTH = 80;

function stableStringHash(value: string): string {
    let hash = 0x811c9dc5;

    for (const character of value) {
        hash ^= character.codePointAt(0) ?? 0;
        hash = Math.imul(hash, 0x01000193);
    }

    return (hash >>> 0).toString(36);
}

/**
 * Builds a Better Auth-compatible ASCII slug from an organization name.
 * Names whose scripts cannot be transliterated to ASCII receive a stable,
 * non-empty fallback instead of the empty slug produced by the old regex.
 */
export function buildOrganizationSlug(value: string): string {
    const trimmedValue = value.trim();
    const asciiSlug = trimmedValue
        .normalize('NFKD')
        .replace(/\p{M}+/gu, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, MAX_SLUG_LENGTH)
        .replace(/-+$/g, '');

    if (asciiSlug) {
        return asciiSlug;
    }

    return `${DEFAULT_SLUG_PREFIX}-${stableStringHash(trimmedValue || value)}`;
}
