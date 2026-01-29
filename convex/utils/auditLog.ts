import { MutationCtx } from '../_generated/server';

/**
 * Resource types for audit logging
 */
export type AuditResourceType =
    | 'objective'
    | 'progress_update'
    | 'organization'
    | 'organization_member'
    | 'category'
    | 'user'
    | 'session'
    | 'permission';

/**
 * Action types for audit logging
 */
export type AuditAction =
    // Objective actions
    | 'objective.created'
    | 'objective.updated'
    | 'objective.deleted'
    | 'objective.status_changed'
    | 'objective.completed'
    | 'objective.archived'
    | 'objective.paused'
    // Progress update actions
    | 'progress_update.created'
    | 'progress_update.updated'
    | 'progress_update.deleted'
    // Organization actions
    | 'organization.created'
    | 'organization.updated'
    | 'organization.deleted'
    // Organization member actions
    | 'organization_member.added'
    | 'organization_member.updated'
    | 'organization_member.removed'
    // Category actions
    | 'category.created'
    | 'category.updated'
    | 'category.deleted'
    | 'category.defaults_created'
    // User actions
    | 'user.account_updated'
    | 'user.promoted_to_admin'
    // Session actions
    | 'session.invalidated'
    // Permission actions
    | 'permission.granted'
    | 'permission.revoked';

/**
 * Severity levels for audit logs
 */
export type AuditSeverity = 'info' | 'warning' | 'critical';

/**
 * Metadata for audit logs
 */
export interface AuditMetadata {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    context?: string;
}

/**
 * Parameters for creating an audit log entry
 */
export interface CreateAuditLogParams {
    userId: string;
    action: AuditAction;
    resourceType: AuditResourceType;
    resourceId?: string;
    metadata?: AuditMetadata;
    severity?: AuditSeverity;
}

/**
 * Determines the default severity based on the action type
 */
function getDefaultSeverity(action: AuditAction): AuditSeverity {
    // Critical actions - deletions and role changes
    if (
        action.includes('deleted') ||
        action.includes('removed') ||
        action === 'user.promoted_to_admin' ||
        action === 'permission.granted' ||
        action === 'permission.revoked'
    ) {
        return 'critical';
    }

    // Warning actions - status changes
    if (
        action.includes('status_changed') ||
        action === 'objective.completed' ||
        action === 'objective.archived' ||
        action === 'objective.paused' ||
        action === 'session.invalidated'
    ) {
        return 'warning';
    }

    // Info actions - everything else (creates, updates)
    return 'info';
}

/**
 * Creates an audit log entry
 *
 * @example
 * ```typescript
 * await createAuditLog(ctx, {
 *     userId: 'user-123',
 *     action: 'objective.created',
 *     resourceType: 'objective',
 *     resourceId: objectiveId,
 *     metadata: {
 *         after: { title: 'New objective', targetValue: 100 },
 *     },
 * });
 * ```
 */
export async function createAuditLog(
    ctx: MutationCtx,
    params: CreateAuditLogParams
): Promise<void> {
    const { userId, action, resourceType, resourceId, metadata, severity } = params;

    // Skip audit logging in tests to avoid interference
    if (process.env.VITEST || process.env.NODE_ENV === 'test') {
        return;
    }

    const resolvedSeverity = severity ?? getDefaultSeverity(action);

    try {
        await ctx.db.insert('auditLogs', {
            userId: userId,
            organizationId: '',
            action,
            resourceType,
            resourceId,
            metadata: metadata
                ? {
                    before: metadata.before,
                    after: metadata.after,
                    context: metadata.context,
                }
                : undefined,
            severity: resolvedSeverity,
            createdAt: Date.now(),
        });
    } catch (error) {
        // Log the error but don't throw - audit logging should not break the main operation
        console.error('[AuditLog] Failed to create audit log:', error);
    }
}

/**
 * Helper to extract relevant fields from an object for audit logging
 * Removes internal fields like _id, _creationTime, createdAt, updatedAt
 */
export function sanitizeForAudit<T extends Record<string, unknown>>(
    obj: T,
    excludeFields: string[] = []
): Partial<T> {
    const defaultExclude = ['_id', '_creationTime', 'createdAt', 'updatedAt'];
    const allExcluded = new Set([...defaultExclude, ...excludeFields]);

    return Object.fromEntries(
        Object.entries(obj).filter(([key]) => !allExcluded.has(key))
    ) as Partial<T>;
}

/**
 * Helper to create a diff of changes between two objects
 */
export function createChangeDiff<T extends Record<string, unknown>>(
    before: T,
    after: Partial<T>
): { before: Partial<T>; after: Partial<T> } {
    const changedBefore: Partial<T> = {};
    const changedAfter: Partial<T> = {};

    for (const key of Object.keys(after) as Array<keyof T>) {
        if (before[key] !== after[key]) {
            changedBefore[key] = before[key];
            changedAfter[key] = after[key];
        }
    }

    return { before: changedBefore, after: changedAfter };
}
