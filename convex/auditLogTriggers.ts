import { Triggers, type Change } from 'convex-helpers/server/triggers';
import type { GenericDatabaseWriter, TableNamesInDataModel } from 'convex/server';
import type { DataModel, Id } from './_generated/dataModel';

type AuditTriggerCtx = {
    db: GenericDatabaseWriter<DataModel>;
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

function sanitizeObjective(doc: unknown): Record<string, unknown> | undefined {
    if (!doc || typeof doc !== 'object') return undefined;
    const o = doc as Record<string, unknown>;
    return {
        _id: o._id,
        organizationId: o.organizationId,
        userId: o.userId,
        scope: o.scope,
        status: o.status,
        title: o.title,
        category: o.category,
        targetValue: o.targetValue,
        currentValue: o.currentValue,
        startValue: o.startValue,
        deadline: o.deadline,
        unit: o.unit,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
    };
}

function sanitizeProgressUpdate(doc: unknown): Record<string, unknown> | undefined {
    if (!doc || typeof doc !== 'object') return undefined;
    const o = doc as Record<string, unknown>;
    return {
        _id: o._id,
        objective: o.objective,
        updatedValue: o.updatedValue,
        updateDate: o.updateDate,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
    };
}

function sanitizeCategory(doc: unknown): Record<string, unknown> | undefined {
    if (!doc || typeof doc !== 'object') return undefined;
    const o = doc as Record<string, unknown>;
    return {
        _id: o._id,
        userId: o.userId,
        organizationId: o.organizationId,
        name: o.name,
        color: o.color,
        icon: o.icon,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
    };
}

function sanitizeOrganization(doc: unknown): Record<string, unknown> | undefined {
    if (!doc || typeof doc !== 'object') return undefined;
    const o = doc as Record<string, unknown>;
    return {
        _id: o._id,
        name: o.name,
        slug: o.slug,
        logo: o.logo,
        createdAt: o.createdAt,
    };
}

function sanitizeMember(doc: unknown): Record<string, unknown> | undefined {
    if (!doc || typeof doc !== 'object') return undefined;
    const o = doc as Record<string, unknown>;
    return {
        _id: o._id,
        organizationId: o.organizationId,
        userId: o.userId,
        role: o.role,
        createdAt: o.createdAt,
    };
}

function sanitizeUser(doc: unknown): Record<string, unknown> | undefined {
    if (!doc || typeof doc !== 'object') return undefined;
    const o = doc as Record<string, unknown>;
    return {
        _id: o._id,
        name: o.name,
        role: o.role,
        banned: o.banned,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
    };
}

function sanitizePlatformSettings(doc: unknown): Record<string, unknown> | undefined {
    if (!doc || typeof doc !== 'object') return undefined;
    const o = doc as Record<string, unknown>;
    return {
        _id: o._id,
        platformName: o.platformName,
        defaultLanguage: o.defaultLanguage,
        registrationPolicy: o.registrationPolicy,
        setupCompletedAt: o.setupCompletedAt,
        setupCompletedBy: o.setupCompletedBy,
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

function sanitizeDoc(table: SanitizedTable, doc: unknown): Record<string, unknown> | undefined {
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

const toMetadata = <TableName extends TableNamesInDataModel<DataModel>>(
    table: SanitizedTable,
    change: Change<DataModel, TableName>
) => {
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
