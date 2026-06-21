import { Triggers, type Change } from 'convex-helpers/server/triggers';
import type { TableNamesInDataModel } from 'convex/server';
import type { DatabaseWriter } from '../../_generated/server';
import type { DataModel, Id } from '../../_generated/dataModel';
import { toAuditPrimitive } from '../../domain/audit/privacy';

type AuditTriggerCtx = {
    db: DatabaseWriter;
    userId: Id<'user'>;
    organizationId: Id<'organization'> | null;
    role: string;
};

type AuditResourceType =
    | 'objective'
    | 'objective_collaborator'
    | 'progress_update'
    | 'category'
    | 'organization'
    | 'organization_member'
    | 'user'
    | 'platform_settings';

const triggers = new Triggers<DataModel, AuditTriggerCtx>();

function sanitizeObjective(
    doc: unknown
): Record<string, string | number | boolean | null> | undefined {
    if (!doc || typeof doc !== 'object') return undefined;
    const objectiveRecord = doc as Record<string, unknown>;
    return {
        _id: toAuditPrimitive(objectiveRecord._id),
        organizationId: toAuditPrimitive(objectiveRecord.organizationId),
        createdBy: toAuditPrimitive(objectiveRecord.createdBy),
        ownerId: toAuditPrimitive(objectiveRecord.ownerId),
        visibility: toAuditPrimitive(objectiveRecord.visibility),
        status: toAuditPrimitive(objectiveRecord.status),
        categoryId: toAuditPrimitive(objectiveRecord.categoryId),
        targetValue: toAuditPrimitive(objectiveRecord.targetValue),
        currentValue: toAuditPrimitive(objectiveRecord.currentValue),
        startValue: toAuditPrimitive(objectiveRecord.startValue),
        deadline: toAuditPrimitive(objectiveRecord.deadline),
        deletedAt: toAuditPrimitive(objectiveRecord.deletedAt),
        deletedBy: toAuditPrimitive(objectiveRecord.deletedBy),
        createdAt: toAuditPrimitive(objectiveRecord.createdAt),
        updatedAt: toAuditPrimitive(objectiveRecord.updatedAt),
    };
}

function sanitizeObjectiveCollaborator(
    doc: unknown
): Record<string, string | number | boolean | null> | undefined {
    if (!doc || typeof doc !== 'object') return undefined;
    const collaboratorRecord = doc as Record<string, unknown>;
    return {
        _id: toAuditPrimitive(collaboratorRecord._id),
        objectiveId: toAuditPrimitive(collaboratorRecord.objectiveId),
        userId: toAuditPrimitive(collaboratorRecord.userId),
        organizationId: toAuditPrimitive(collaboratorRecord.organizationId),
        role: toAuditPrimitive(collaboratorRecord.role),
        addedBy: toAuditPrimitive(collaboratorRecord.addedBy),
        createdAt: toAuditPrimitive(collaboratorRecord.createdAt),
    };
}

function sanitizeProgressUpdate(
    doc: unknown
): Record<string, string | number | boolean | null> | undefined {
    if (!doc || typeof doc !== 'object') return undefined;
    const progressUpdateRecord = doc as Record<string, unknown>;
    return {
        _id: toAuditPrimitive(progressUpdateRecord._id),
        objective: toAuditPrimitive(progressUpdateRecord.objective),
        createdBy: toAuditPrimitive(progressUpdateRecord.createdBy),
        updatedValue: toAuditPrimitive(progressUpdateRecord.updatedValue),
        updateDate: toAuditPrimitive(progressUpdateRecord.updateDate),
        createdAt: toAuditPrimitive(progressUpdateRecord.createdAt),
        updatedAt: toAuditPrimitive(progressUpdateRecord.updatedAt),
    };
}

function sanitizeCategory(
    doc: unknown
): Record<string, string | number | boolean | null> | undefined {
    if (!doc || typeof doc !== 'object') return undefined;
    const categoryRecord = doc as Record<string, unknown>;
    return {
        _id: toAuditPrimitive(categoryRecord._id),
        userId: toAuditPrimitive(categoryRecord.userId),
        organizationId: toAuditPrimitive(categoryRecord.organizationId),
        createdAt: toAuditPrimitive(categoryRecord.createdAt),
        updatedAt: toAuditPrimitive(categoryRecord.updatedAt),
    };
}

function sanitizeOrganization(
    doc: unknown
): Record<string, string | number | boolean | null> | undefined {
    if (!doc || typeof doc !== 'object') return undefined;
    const organizationRecord = doc as Record<string, unknown>;
    return {
        _id: toAuditPrimitive(organizationRecord._id),
        createdAt: toAuditPrimitive(organizationRecord.createdAt),
    };
}

function sanitizeMember(
    doc: unknown
): Record<string, string | number | boolean | null> | undefined {
    if (!doc || typeof doc !== 'object') return undefined;
    const memberRecord = doc as Record<string, unknown>;
    return {
        _id: toAuditPrimitive(memberRecord._id),
        organizationId: toAuditPrimitive(memberRecord.organizationId),
        userId: toAuditPrimitive(memberRecord.userId),
        role: toAuditPrimitive(memberRecord.role),
        createdAt: toAuditPrimitive(memberRecord.createdAt),
    };
}

function sanitizeUser(doc: unknown): Record<string, string | number | boolean | null> | undefined {
    if (!doc || typeof doc !== 'object') return undefined;
    const userRecord = doc as Record<string, unknown>;
    return {
        _id: toAuditPrimitive(userRecord._id),
        role: toAuditPrimitive(userRecord.role),
        banned: toAuditPrimitive(userRecord.banned),
        createdAt: toAuditPrimitive(userRecord.createdAt),
        updatedAt: toAuditPrimitive(userRecord.updatedAt),
    };
}

function sanitizePlatformSettings(
    doc: unknown
): Record<string, string | number | boolean | null> | undefined {
    if (!doc || typeof doc !== 'object') return undefined;
    const platformSettingsRecord = doc as Record<string, unknown>;
    return {
        _id: toAuditPrimitive(platformSettingsRecord._id),
        defaultLanguage: toAuditPrimitive(platformSettingsRecord.defaultLanguage),
        registrationPolicy: toAuditPrimitive(platformSettingsRecord.registrationPolicy),
        setupCompletedAt: toAuditPrimitive(platformSettingsRecord.setupCompletedAt),
        setupCompletedBy: toAuditPrimitive(platformSettingsRecord.setupCompletedBy),
    };
}

type SanitizedTable =
    | 'objectives'
    | 'objectiveCollaborators'
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
        case 'objectiveCollaborators':
            return sanitizeObjectiveCollaborator(doc);
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
        | 'objectiveCollaborators'
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

registerSimpleTrigger('objectiveCollaborators', 'objective_collaborator', (_ctx, change) => {
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
    return organizationId;
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
