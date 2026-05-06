import { Triggers, type Change } from 'convex-helpers/server/triggers';
import type { TableNamesInDataModel } from 'convex/server';
import type { DatabaseWriter } from './_generated/server';
import type { DataModel, Id } from './_generated/dataModel';

type AuditTriggerCtx = {
    db: DatabaseWriter;
    userId: Id<'user'>;
    organizationId: Id<'organization'> | null;
    role: string;
};

type AuditResourceType =
    | 'objective'
    | 'progress_update'
    | 'category'
    | 'organization'
    | 'organization_member'
    | 'user'
    | 'platform_settings';

const triggers = new Triggers<DataModel, AuditTriggerCtx>();

function toAuditPrimitive(value: unknown): string | number | boolean | null {
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
}

function sanitizeObjective(
    doc: unknown
): Record<string, string | number | boolean | null> | undefined {
    if (!doc || typeof doc !== 'object') return undefined;
    const o = doc as Record<string, unknown>;
    return {
        _id: toAuditPrimitive(o._id),
        organizationId: toAuditPrimitive(o.organizationId),
        userId: toAuditPrimitive(o.userId),
        scope: toAuditPrimitive(o.scope),
        status: toAuditPrimitive(o.status),
        title: toAuditPrimitive(o.title),
        category: toAuditPrimitive(o.category),
        targetValue: toAuditPrimitive(o.targetValue),
        currentValue: toAuditPrimitive(o.currentValue),
        startValue: toAuditPrimitive(o.startValue),
        deadline: toAuditPrimitive(o.deadline),
        unit: toAuditPrimitive(o.unit),
        createdAt: toAuditPrimitive(o.createdAt),
        updatedAt: toAuditPrimitive(o.updatedAt),
    };
}

function sanitizeProgressUpdate(
    doc: unknown
): Record<string, string | number | boolean | null> | undefined {
    if (!doc || typeof doc !== 'object') return undefined;
    const o = doc as Record<string, unknown>;
    return {
        _id: toAuditPrimitive(o._id),
        objective: toAuditPrimitive(o.objective),
        updatedValue: toAuditPrimitive(o.updatedValue),
        updateDate: toAuditPrimitive(o.updateDate),
        createdAt: toAuditPrimitive(o.createdAt),
        updatedAt: toAuditPrimitive(o.updatedAt),
    };
}

function sanitizeCategory(
    doc: unknown
): Record<string, string | number | boolean | null> | undefined {
    if (!doc || typeof doc !== 'object') return undefined;
    const o = doc as Record<string, unknown>;
    return {
        _id: toAuditPrimitive(o._id),
        userId: toAuditPrimitive(o.userId),
        organizationId: toAuditPrimitive(o.organizationId),
        name: toAuditPrimitive(o.name),
        color: toAuditPrimitive(o.color),
        icon: toAuditPrimitive(o.icon),
        createdAt: toAuditPrimitive(o.createdAt),
        updatedAt: toAuditPrimitive(o.updatedAt),
    };
}

function sanitizeOrganization(
    doc: unknown
): Record<string, string | number | boolean | null> | undefined {
    if (!doc || typeof doc !== 'object') return undefined;
    const o = doc as Record<string, unknown>;
    return {
        _id: toAuditPrimitive(o._id),
        name: toAuditPrimitive(o.name),
        slug: toAuditPrimitive(o.slug),
        logo: toAuditPrimitive(o.logo),
        createdAt: toAuditPrimitive(o.createdAt),
    };
}

function sanitizeMember(
    doc: unknown
): Record<string, string | number | boolean | null> | undefined {
    if (!doc || typeof doc !== 'object') return undefined;
    const o = doc as Record<string, unknown>;
    return {
        _id: toAuditPrimitive(o._id),
        organizationId: toAuditPrimitive(o.organizationId),
        userId: toAuditPrimitive(o.userId),
        role: toAuditPrimitive(o.role),
        createdAt: toAuditPrimitive(o.createdAt),
    };
}

function sanitizeUser(doc: unknown): Record<string, string | number | boolean | null> | undefined {
    if (!doc || typeof doc !== 'object') return undefined;
    const o = doc as Record<string, unknown>;
    return {
        _id: toAuditPrimitive(o._id),
        name: toAuditPrimitive(o.name),
        role: toAuditPrimitive(o.role),
        banned: toAuditPrimitive(o.banned),
        createdAt: toAuditPrimitive(o.createdAt),
        updatedAt: toAuditPrimitive(o.updatedAt),
    };
}

function sanitizePlatformSettings(
    doc: unknown
): Record<string, string | number | boolean | null> | undefined {
    if (!doc || typeof doc !== 'object') return undefined;
    const o = doc as Record<string, unknown>;
    return {
        _id: toAuditPrimitive(o._id),
        platformName: toAuditPrimitive(o.platformName),
        defaultLanguage: toAuditPrimitive(o.defaultLanguage),
        registrationPolicy: toAuditPrimitive(o.registrationPolicy),
        setupCompletedAt: toAuditPrimitive(o.setupCompletedAt),
        setupCompletedBy: toAuditPrimitive(o.setupCompletedBy),
    };
}

type SanitizedTable =
    | 'objectives'
    | 'progressUpdates'
    | 'categories'
    | 'organization'
    | 'member'
    | 'user'
    | 'platformSettings';

function sanitizeDoc(
    table: SanitizedTable,
    doc: unknown
): Record<string, string | number | boolean | null> | undefined {
    switch (table) {
        case 'objectives':
            return sanitizeObjective(doc);
        case 'progressUpdates':
            return sanitizeProgressUpdate(doc);
        case 'categories':
            return sanitizeCategory(doc);
        case 'organization':
            return sanitizeOrganization(doc);
        case 'member':
            return sanitizeMember(doc);
        case 'user':
            return sanitizeUser(doc);
        case 'platformSettings':
            return sanitizePlatformSettings(doc);
        default: {
            const _exhaustive: never = table;
            return _exhaustive;
        }
    }
}

type AuditMetadata = {
    before?: Record<string, string | number | boolean | null>;
    after?: Record<string, string | number | boolean | null>;
    context?: string;
};

const toMetadata = <TableName extends TableNamesInDataModel<DataModel>>(
    table: SanitizedTable,
    change: Change<DataModel, TableName>
): AuditMetadata => {
    switch (change.operation) {
        case 'insert':
            return {
                after: sanitizeDoc(table, change.newDoc),
            };
        case 'update':
            return {
                before: sanitizeDoc(table, change.oldDoc),
                after: sanitizeDoc(table, change.newDoc),
            };
        case 'delete':
            return {
                before: sanitizeDoc(table, change.oldDoc),
            };
    }
};

const toAction = (
    resourceType: AuditResourceType,
    operation: Change<DataModel, TableNamesInDataModel<DataModel>>['operation']
) =>
    `${resourceType}.${operation === 'insert' ? 'created' : operation === 'update' ? 'updated' : 'deleted'}`;

const registerSimpleTrigger = <
    TableName extends
        | 'objectives'
        | 'categories'
        | 'organization'
        | 'member'
        | 'user'
        | 'platformSettings',
>(
    tableName: TableName,
    resourceType: AuditResourceType,
    getOrganizationId: (
        ctx: AuditTriggerCtx,
        change: Change<DataModel, TableName>
    ) => Id<'organization'> | null
) => {
    triggers.register(tableName, async (ctx, change) => {
        const organizationId = getOrganizationId(ctx, change);
        if (!organizationId) {
            return;
        }

        await ctx.innerDb.insert('auditLogs', {
            userId: ctx.userId,
            organizationId,
            action: toAction(resourceType, change.operation),
            resourceType,
            resourceId: String(change.id),
            metadata: toMetadata(tableName, change),
            severity: 'info',
            createdAt: Date.now(),
        });
    });
};

registerSimpleTrigger('objectives', 'objective', (_ctx, change) => {
    return change.newDoc?.organizationId ?? change.oldDoc?.organizationId ?? null;
});

registerSimpleTrigger('categories', 'category', (_ctx, change) => {
    return change.newDoc?.organizationId ?? change.oldDoc?.organizationId ?? null;
});

registerSimpleTrigger('organization', 'organization', (_ctx, change) => {
    return change.newDoc?._id ?? change.oldDoc?._id ?? null;
});

registerSimpleTrigger('member', 'organization_member', (_ctx, change) => {
    const organizationId = change.newDoc?.organizationId ?? change.oldDoc?.organizationId ?? null;
    return organizationId as Id<'organization'> | null;
});

registerSimpleTrigger('user', 'user', ctx => ctx.organizationId);

registerSimpleTrigger('platformSettings', 'platform_settings', ctx => ctx.organizationId);

triggers.register('progressUpdates', async (ctx, change) => {
    const objectiveId = change.newDoc?.objective ?? change.oldDoc?.objective;
    if (!objectiveId) {
        return;
    }

    const objective = await ctx.innerDb.get(objectiveId);
    if (!objective) {
        return;
    }

    await ctx.innerDb.insert('auditLogs', {
        userId: ctx.userId,
        organizationId: objective.organizationId,
        action: toAction('progress_update', change.operation),
        resourceType: 'progress_update',
        resourceId: String(change.id),
        metadata: toMetadata('progressUpdates', change),
        severity: 'info',
        createdAt: Date.now(),
    });
});

export { triggers as auditLogTriggers };
