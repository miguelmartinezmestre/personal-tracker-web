import { z } from 'zod';

export const DEFAULT_ORGANIZATION_NAME = 'Personal Organization';
export const DEFAULT_ORGANIZATION_SLUG_BASE = 'personal-organization';

export const PERSONAL_ORGANIZATION_METADATA_TYPE = 'personal';
export const personalOrganizationMetadataSchema = z.looseObject({
    type: z.literal(PERSONAL_ORGANIZATION_METADATA_TYPE),
    ownerUserId: z.string().optional().catch(undefined),
});

function parseMetadataObject(metadata: string) {
    try {
        const parsed: unknown = JSON.parse(metadata);
        const result = personalOrganizationMetadataSchema.safeParse(parsed);
        return result.success ? result.data : undefined;
    } catch {
        return undefined;
    }
}

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

    const parsed = parseMetadataObject(metadata);
    return parsed !== undefined;
}

export function getPersonalOrganizationOwnerUserId(
    metadata: string | null | undefined
): string | null {
    if (!metadata) {
        return null;
    }

    const parsed = parseMetadataObject(metadata);
    if (parsed === undefined) {
        return null;
    }

    if (parsed.ownerUserId && parsed.ownerUserId.length > 0) {
        return parsed.ownerUserId;
    }

    return null;
}

export function buildPersonalOrganizationMetadata(userId: string) {
    return JSON.stringify({
        type: PERSONAL_ORGANIZATION_METADATA_TYPE,
        ownerUserId: userId,
    });
}

export function isPersonalOrganizationForUser({
    metadata,
    userId,
}: {
    metadata: string | null | undefined;
    userId: string;
}) {
    return getPersonalOrganizationOwnerUserId(metadata) === userId;
}
