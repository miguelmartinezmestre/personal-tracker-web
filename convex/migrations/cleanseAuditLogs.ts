import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';
import { internal } from '../_generated/api';

const REDACTION_KEYS = new Set([
    'token',
    'password',
    'accessToken',
    'refreshToken',
    'idToken',
    'hashedPassword',
    'otp',
    'secret',
    'clientSecret',

    'email',
    'ipAddress',
    'userAgent',
    'image',
    'accountId',
    'impersonatedBy',

    'value',
]);

const ALLOWED_SESSION_FIELDS = new Set([
    '_id',
    'userId',
    'activeOrganizationId',
    'expiresAt',
    'createdAt',
    'updatedAt',
]);

const ALLOWED_USER_FIELDS = new Set([
    '_id',
    'name',
    'emailVerified',
    'createdAt',
    'updatedAt',
    'role',
    'banned',
    'banReason',
    'banExpires',
]);

const ALLOWED_INVITATION_FIELDS = new Set([
    '_id',
    'organizationId',
    'role',
    'status',
    'expiresAt',
    'createdAt',
    'inviterId',
]);

const redactSensitiveData = (value: unknown): unknown => {
    if (value === null || typeof value !== 'object') {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map(redactSensitiveData);
    }
    const obj = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
        if (REDACTION_KEYS.has(key)) {
            continue;
        }
        result[key] = redactSensitiveData(obj[key]);
    }
    return result;
};

const toAuditPrimitive = (value: unknown): string | number | boolean | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value;

    if (typeof value === 'object') {
        if (typeof (value as { _id?: unknown })._id === 'string') {
            return (value as { _id: string })._id;
        }
        return String(value);
    }
    return String(value);
};

const sanitizeByResourceType = (
    resourceType: string,
    data: Record<string, unknown>
): Record<string, string | number | boolean | null> => {
    const result: Record<string, string | number | boolean | null> = {};

    switch (resourceType) {
        case 'session':
            for (const key of Object.keys(data)) {
                if (ALLOWED_SESSION_FIELDS.has(key)) {
                    result[key] = toAuditPrimitive(data[key]);
                }
            }
            break;
        case 'user':
            for (const key of Object.keys(data)) {
                if (ALLOWED_USER_FIELDS.has(key)) {
                    result[key] = toAuditPrimitive(data[key]);
                }
            }
            break;
        case 'invitation':
            for (const key of Object.keys(data)) {
                if (ALLOWED_INVITATION_FIELDS.has(key)) {
                    result[key] = toAuditPrimitive(data[key]);
                }
            }
            break;
        default: {
            const redacted = redactSensitiveData(data) as Record<string, unknown>;
            for (const key of Object.keys(redacted)) {
                result[key] = toAuditPrimitive(redacted[key]);
            }
            break;
        }
    }

    return result;
};

const containsSensitiveData = (value: unknown): boolean => {
    if (value === null || typeof value !== 'object') {
        return false;
    }
    if (Array.isArray(value)) {
        return value.some(containsSensitiveData);
    }
    const obj = value as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
        if (REDACTION_KEYS.has(key)) {
            return true;
        }
        if (containsSensitiveData(obj[key])) {
            return true;
        }
    }
    return false;
};

export const cleanseAuditLogs = internalMutation({
    args: {
        cursor: v.optional(v.union(v.string(), v.null())),

        batchSize: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const BATCH_SIZE = args.batchSize ?? 100;
        let logsProcessed = 0;
        let logsUpdated = 0;
        let logsWithTokens = 0;

        const page = await ctx.db.query('auditLogs').paginate({
            numItems: BATCH_SIZE,
            cursor: args.cursor ?? null,
        });
        const logs = page.page;

        if (logs.length === 0 && page.isDone) {
            console.log('Migration complete: No more audit logs to process');
            return {
                status: 'complete',
                logsProcessed: 0,
                logsUpdated: 0,
                logsWithTokens: 0,
                continueCursor: page.continueCursor,
            };
        }

        for (const log of logs) {
            logsProcessed++;

            if (!log.metadata) {
                continue;
            }

            let needsUpdate = false;
            const newMetadata: {
                before?: Record<string, string | number | boolean | null>;
                after?: Record<string, string | number | boolean | null>;
                context?: string;
            } = {};

            if (log.metadata.before) {
                if (containsSensitiveData(log.metadata.before)) {
                    needsUpdate = true;
                    logsWithTokens++;
                    newMetadata.before = sanitizeByResourceType(
                        log.resourceType,
                        log.metadata.before as Record<string, unknown>
                    );
                } else {
                    const safeBefore: Record<string, string | number | boolean | null> = {};
                    for (const key of Object.keys(log.metadata.before)) {
                        safeBefore[key] = toAuditPrimitive(
                            (log.metadata.before as Record<string, unknown>)[key]
                        );
                    }
                    newMetadata.before = safeBefore;
                }
            }

            if (log.metadata.after) {
                if (containsSensitiveData(log.metadata.after)) {
                    needsUpdate = true;
                    logsWithTokens++;
                    newMetadata.after = sanitizeByResourceType(
                        log.resourceType,
                        log.metadata.after as Record<string, unknown>
                    );
                } else {
                    const safeAfter: Record<string, string | number | boolean | null> = {};
                    for (const key of Object.keys(log.metadata.after)) {
                        safeAfter[key] = toAuditPrimitive(
                            (log.metadata.after as Record<string, unknown>)[key]
                        );
                    }
                    newMetadata.after = safeAfter;
                }
            }

            if (log.metadata.context) {
                newMetadata.context = log.metadata.context;
            }

            if (needsUpdate) {
                await ctx.db.patch(log._id, { metadata: newMetadata });
                logsUpdated++;
            }
        }

        console.log(
            `Batch processed: ${logsProcessed} logs checked, ${logsUpdated} updated, ${logsWithTokens} contained sensitive data`
        );

        if (!page.isDone) {
            await ctx.scheduler.runAfter(0, internal.migrations.cleanseAuditLogs.cleanseAuditLogs, {
                batchSize: BATCH_SIZE,
                cursor: page.continueCursor,
            });
            return {
                status: 'in_progress',
                logsProcessed,
                logsUpdated,
                logsWithTokens,
                continueCursor: page.continueCursor,
                message: 'Next batch scheduled',
            };
        }

        return {
            status: 'complete',
            logsProcessed,
            logsUpdated,
            logsWithTokens,
            continueCursor: page.continueCursor,
            message: 'All audit logs processed',
        };
    },
});
