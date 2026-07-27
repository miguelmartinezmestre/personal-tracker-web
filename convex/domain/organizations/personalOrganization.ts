export const DEFAULT_ORGANIZATION_NAME = 'Personal Organization';
export const DEFAULT_ORGANIZATION_SLUG_BASE = 'personal-organization';

export const PERSONAL_ORGANIZATION_METADATA_TYPE = 'personal';

type PersonalOrganizationMetadata = {
    type?: unknown;
    ownerUserId?: unknown;
};

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
        const parsed = JSON.parse(metadata) as PersonalOrganizationMetadata | null;
        return parsed?.type === PERSONAL_ORGANIZATION_METADATA_TYPE;
    } catch {
        return false;
    }
}

export function getPersonalOrganizationOwnerUserId(
    metadata: string | null | undefined
): string | null {
    if (!metadata) {
        return null;
    }

    try {
        const parsed = JSON.parse(metadata) as PersonalOrganizationMetadata | null;
        return parsed?.type === PERSONAL_ORGANIZATION_METADATA_TYPE &&
            typeof parsed.ownerUserId === 'string' &&
            parsed.ownerUserId.length > 0
            ? parsed.ownerUserId
            : null;
    } catch {
        return null;
    }
}

export function buildPersonalOrganizationMetadata(userId: string) {
    return JSON.stringify({
        type: PERSONAL_ORGANIZATION_METADATA_TYPE,
        ownerUserId: userId,
    });
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
    const metadataOwnerUserId = getPersonalOrganizationOwnerUserId(metadata);
    if (metadataOwnerUserId) {
        return metadataOwnerUserId === userId;
    }

    // Legacy personal workspaces did not persist an owner in metadata. Their
    // user-derived slug is the only ownership signal that can be trusted.
    return isLegacyPersonalOrganizationSlugForUser(slug, userId);
}
