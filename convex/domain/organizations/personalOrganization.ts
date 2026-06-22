export const DEFAULT_ORGANIZATION_NAME = 'Personal Organization';
export const DEFAULT_ORGANIZATION_SLUG_BASE = 'personal-organization';

export const PERSONAL_ORGANIZATION_METADATA_TYPE = 'personal';

export function buildDefaultOrganizationSlug(userId: string) {
    const normalizedSuffix = userId
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(-12);

    return `${DEFAULT_ORGANIZATION_SLUG_BASE}-${normalizedSuffix || Date.now().toString(36)}`;
}

export function isPersonalOrganizationMetadata(metadata: string | null | undefined) {
    if (!metadata) {
        return false;
    }

    try {
        const parsed = JSON.parse(metadata) as { type?: unknown } | null;
        return parsed?.type === PERSONAL_ORGANIZATION_METADATA_TYPE;
    } catch {
        return false;
    }
}

export function isLegacyPersonalOrganizationSlugForUser(slug: string, userId: string) {
    return slug === buildDefaultOrganizationSlug(userId);
}

export function isPersonalOrganizationForUser({
    metadata,
    slug,
    userId,
}: {
    metadata: string | null | undefined;
    slug: string;
    userId: string;
}) {
    return (
        isPersonalOrganizationMetadata(metadata) ||
        isLegacyPersonalOrganizationSlugForUser(slug, userId)
    );
}
