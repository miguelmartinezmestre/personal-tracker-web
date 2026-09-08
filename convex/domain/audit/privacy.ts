import type { Id } from '../../_generated/dataModel';
import { isJsonObject, type JsonObject, type JsonValue } from '../../../shared/boundary-values';
/**
 * Returns the actor id only when it differs from the affected user (`userId`).
 * When the actor and the subject are the same person (e.g. a user acting on their
 * own resource), the actor is left empty (`undefined`) to avoid redundant data.
 */
export const resolveActorUserId = (
    userId: Id<'user'>,
    actorUserId: Id<'user'> | null | undefined
): Id<'user'> | undefined => (actorUserId && actorUserId !== userId ? actorUserId : undefined);
export type AuditPrimitive = string | number | boolean | null;
type AuditRecord = Record<string, AuditPrimitive>;
type AuditValueLevel1 = AuditPrimitive | AuditPrimitive[] | AuditRecord;
export type AuditMetadataSnapshot =
    AuditValueLevel1 | AuditValueLevel1[] | Record<string, AuditValueLevel1>;
type AuditMetadataInput = {
    before?: JsonValue | AuditMetadataSnapshot;
    after?: JsonValue | AuditMetadataSnapshot;
    context?: string;
};
export type AuditMetadata = {
    before?: AuditMetadataSnapshot;
    after?: AuditMetadataSnapshot;
    context?: string;
};
const DISALLOWED_AUDIT_METADATA_KEYS = new Set(
    [
        'accountId',
        'accessToken',
        'banReason',
        'category',
        'clientSecret',
        'comment',
        'description',
        'email',
        'hashedPassword',
        'idToken',
        'image',
        'impersonatedBy',
        'ipAddress',
        'logo',
        'name',
        'otp',
        'password',
        'platformName',
        'refreshToken',
        'secret',
        'slug',
        'title',
        'token',
        'unit',
        'userAgent',
        'value',
    ].map(key => key.toLowerCase())
);
const RESOURCE_ALLOWED_AUDIT_FIELDS: Partial<Record<string, Set<string>>> = {
    session: new Set([
        '_id',
        'userId',
        'activeOrganizationId',
        'expiresAt',
        'createdAt',
        'updatedAt',
    ]),
    user: new Set([
        '_id',
        'emailVerified',
        'createdAt',
        'updatedAt',
        'role',
        'banned',
        'banExpires',
        'deletedAt',
    ]),
    invitation: new Set([
        '_id',
        'organizationId',
        'role',
        'status',
        'expiresAt',
        'createdAt',
        'inviterId',
    ]),
    // Field names must match what the audit-trigger sanitizers actually emit
    // (see platform/audit/triggers.ts) so the allowlist keeps the meaningful,
    // security-relevant fields (ownership, visibility, soft-delete) rather than
    // silently dropping them.
    objective: new Set([
        '_id',
        'organizationId',
        'createdBy',
        'ownerId',
        'visibility',
        'status',
        'categoryId',
        'targetValue',
        'currentValue',
        'startValue',
        'deadline',
        'deletedAt',
        'deletedBy',
        'createdAt',
        'updatedAt',
    ]),
    progress_update: new Set([
        '_id',
        'objective',
        'createdBy',
        'updatedValue',
        'updateDate',
        'createdAt',
        'updatedAt',
    ]),
    category: new Set(['_id', 'userId', 'organizationId', 'createdAt', 'updatedAt']),
    organization: new Set(['_id', 'createdAt']),
    organization_member: new Set(['_id', 'organizationId', 'userId', 'role', 'createdAt']),
    platform_settings: new Set([
        '_id',
        'defaultLanguage',
        'registrationPolicy',
        'setupCompletedAt',
        'setupCompletedBy',
    ]),
};
export function toAuditPrimitive(value: JsonValue | object | null | undefined): AuditPrimitive {
    if (value === null || value === undefined) {
        return null;
    }
    if (typeof value === 'string') {
        return redactPrimitiveString(value);
    }
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    if (isJsonObject(value)) {
        const id = value._id;
        if (typeof id === 'string') {
            return id;
        }
        return null;
    }
    return null;
}
function resolveAuditContext(rawContext: string | undefined): string | undefined {
    if (rawContext === undefined) {
        return undefined;
    }
    const redactedContext = redactPrimitiveString(rawContext).trim();
    if (!redactedContext || redactedContext.includes('[redacted')) {
        return undefined;
    }
    if (/^[A-Za-z0-9_.:-]+$/.test(redactedContext)) {
        return redactedContext;
    }
    return undefined;
}
export function sanitizeAuditMetadata(
    resourceType: string,
    metadata: AuditMetadataInput | undefined
): AuditMetadata | undefined {
    if (metadata === undefined) {
        return undefined;
    }
    const sanitized: AuditMetadata = {};
    const before = sanitizeAuditSnapshot(resourceType, metadata.before);
    const after = sanitizeAuditSnapshot(resourceType, metadata.after);
    const context = resolveAuditContext(metadata.context);
    if (before !== undefined) {
        sanitized.before = before;
    }
    if (after !== undefined) {
        sanitized.after = after;
    }
    if (context !== undefined) {
        sanitized.context = context;
    }
    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}
function isAuditValueLevel1(value: AuditMetadataSnapshot): value is AuditValueLevel1 {
    if (isPrimitive(value)) {
        return true;
    }
    if (Array.isArray(value)) {
        return value.every(item => isPrimitive(item));
    }
    return Object.values(value).every(item => isPrimitive(item));
}
function snapshotFromArray(
    resourceType: string,
    snapshot: readonly JsonValue[]
): AuditMetadataSnapshot | undefined {
    const sanitizedArray: AuditValueLevel1[] = [];
    for (const item of snapshot) {
        const sanitizedItem = sanitizeAuditSnapshot(resourceType, item);
        if (sanitizedItem !== undefined && isAuditValueLevel1(sanitizedItem)) {
            sanitizedArray.push(sanitizedItem);
        }
    }
    return sanitizedArray.length > 0 ? sanitizedArray : undefined;
}
function snapshotFromRecord(
    resourceType: string,
    source: JsonObject
): AuditMetadataSnapshot | undefined {
    const allowedFields = RESOURCE_ALLOWED_AUDIT_FIELDS[resourceType];
    const result: AuditRecord = {};
    for (const key of Object.keys(source)) {
        if (DISALLOWED_AUDIT_METADATA_KEYS.has(key.toLowerCase())) {
            continue;
        }
        if (allowedFields && !allowedFields.has(key)) {
            continue;
        }
        const value = source[key];
        if (isPrimitive(value) || isJsonObject(value)) {
            const primitive = toAuditPrimitive(value);
            if (primitive !== null || value === null) {
                result[key] = primitive;
            }
        }
    }
    return Object.keys(result).length > 0 ? result : undefined;
}
export function sanitizeAuditSnapshot(
    resourceType: string,
    snapshot: JsonValue | AuditMetadataSnapshot | undefined
): AuditMetadataSnapshot | undefined {
    if (snapshot === undefined) {
        return undefined;
    }
    if (isPrimitive(snapshot)) {
        return toAuditPrimitive(snapshot);
    }
    if (Array.isArray(snapshot)) {
        return snapshotFromArray(resourceType, snapshot);
    }
    if (!isJsonObject(snapshot)) {
        return undefined;
    }
    return snapshotFromRecord(resourceType, snapshot);
}
function isPrimitive(
    value: JsonValue | AuditMetadataSnapshot | undefined
): value is AuditPrimitive {
    return (
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    );
}
function redactPrimitiveString(value: string): string {
    return value
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
        .replace(
            /\b(token|password|secret|authorization|bearer|api[_-]?key)\b\s*[:=]\s*\S+/gi,
            '$1=[redacted-secret]'
        );
}
