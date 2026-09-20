import { getOptionalString, isJsonObject, type JsonObject } from '../../../shared/boundary-values';

export const DEFAULT_ORGANIZATION_NAME = 'Personal Organization';
export const DEFAULT_ORGANIZATION_SLUG_BASE = 'personal-organization';

export const PERSONAL_ORGANIZATION_METADATA_TYPE = 'personal';

function parseMetadataObject(metadata: string): JsonObject | undefined {
    try {
        // oxlint-disable-next-line typescript/no-unsafe-assignment -- JSON.parse is an untyped boundary; immediately narrowed by isJsonObject
        const parsed: JsonObject | object | string | number | boolean | null = JSON.parse(metadata);
        if (isJsonObject(parsed)) {
            return parsed;
        }
    } catch {
        return undefined;
    }
    return undefined;
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
    return parsed?.type === PERSONAL_ORGANIZATION_METADATA_TYPE;
}

export function getPersonalOrganizationOwnerUserId(
    metadata: string | null | undefined
): string | null {
    if (!metadata) {
        return null;
    }

    const parsed = parseMetadataObject(metadata);
    if (parsed?.type !== PERSONAL_ORGANIZATION_METADATA_TYPE) {
        return null;
    }

    const ownerUserId = getOptionalString(parsed.ownerUserId);
    if (ownerUserId && ownerUserId.length > 0) {
        return ownerUserId;
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
