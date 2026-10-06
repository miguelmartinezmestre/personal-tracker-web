import type { Id } from './_generated/dataModel';
import { z } from 'zod';

export const resolveActorUserId = (
    userId: Id<'user'>,
    actorUserId: Id<'user'> | null | undefined
): Id<'user'> | undefined => (actorUserId && actorUserId !== userId ? actorUserId : undefined);
export type AuditPrimitive = string | number | boolean | null;
type AuditRecord = Record<string, AuditPrimitive>;
type AuditValueLevel1 = AuditPrimitive | AuditPrimitive[] | AuditRecord;
export type AuditMetadataSnapshot =
    AuditValueLevel1 | AuditValueLevel1[] | Record<string, AuditValueLevel1>;
const auditPrimitiveSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const auditRecordSchema = z.record(z.string(), auditPrimitiveSchema);
const auditValueLevel1Schema = z.union([
    auditPrimitiveSchema,
    z.array(auditPrimitiveSchema),
    auditRecordSchema,
]);
const auditIdContainerSchema = z.looseObject({ _id: z.string() });
type AuditMetadataInput = {
    before?: Record<string, unknown> | AuditMetadataSnapshot;
    after?: Record<string, unknown> | AuditMetadataSnapshot;
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
    organization_member: new Set(['_id', 'organizationId', 'userId', 'role', 'createdAt']),
};
export function toAuditPrimitive(value: unknown): AuditPrimitive {
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
    const idContainer = auditIdContainerSchema.safeParse(value);
    if (idContainer.success && typeof idContainer.data._id === 'string') {
        return idContainer.data._id;
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
function snapshotFromArray(
    resourceType: string,
    snapshot: readonly AuditMetadataSnapshot[]
): AuditMetadataSnapshot | undefined {
    const sanitizedArray: AuditValueLevel1[] = [];
    for (const item of snapshot) {
        const sanitizedItem = sanitizeAuditSnapshot(resourceType, item);
        if (sanitizedItem !== undefined) {
            const parsed = auditValueLevel1Schema.safeParse(sanitizedItem);
            if (parsed.success) {
                sanitizedArray.push(parsed.data);
            }
        }
    }
    return sanitizedArray.length > 0 ? sanitizedArray : undefined;
}
function snapshotFromRecord(
    resourceType: string,
    source: object
): AuditMetadataSnapshot | undefined {
    const allowedFields = RESOURCE_ALLOWED_AUDIT_FIELDS[resourceType];
    const result: AuditRecord = {};
    for (const [key, value] of Object.entries(source)) {
        if (DISALLOWED_AUDIT_METADATA_KEYS.has(key.toLowerCase())) {
            continue;
        }
        if (allowedFields && !allowedFields.has(key)) {
            continue;
        }
        if (isPrimitive(value) || auditIdContainerSchema.safeParse(value).success) {
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
    snapshot: Record<string, unknown> | AuditMetadataSnapshot | undefined
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
    return snapshotFromRecord(resourceType, snapshot);
}
function isPrimitive(value: unknown): value is AuditPrimitive {
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
