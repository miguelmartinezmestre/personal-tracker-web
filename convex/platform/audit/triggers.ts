import { type Change, type Triggers } from 'convex-helpers/server/triggers';
import type { TableNamesInDataModel } from 'convex/server';
import type { MutationCtx } from '../../_generated/server';
import type { DataModel, Id } from '../../_generated/dataModel';
import { toAuditPrimitive } from '../../domain/audit/privacy';
import { isJsonObject } from '../../../shared/boundary-values';

/** Public mutations provide the actor; internal mutations trigger syncs only. */
export type AuditTriggerCtx = MutationCtx & {
    userId?: Id<'user'>;
    organizationId?: Id<'organization'> | null;
    role?: string;
};

type AuditResourceType =
    'objective' | 'objective_collaborator' | 'progress_update' | 'category' | 'user';

type SanitizedTable =
    'objectives' | 'objectiveCollaborators' | 'progressUpdates' | 'categories' | 'user';

type AuditFieldRecord = Record<string, string | number | boolean | null>;

const OPERATION_ACTION_SUFFIX = {
    insert: 'created',
    update: 'updated',
    delete: 'deleted',
} as const;

function sanitizeObjective(doc: object): AuditFieldRecord {
    if (!isJsonObject(doc)) {
        return {};
    }
    return {
        _id: toAuditPrimitive(doc._id),
        organizationId: toAuditPrimitive(doc.organizationId),
        createdBy: toAuditPrimitive(doc.createdBy),
        ownerId: toAuditPrimitive(doc.ownerId),
        visibility: toAuditPrimitive(doc.visibility),
        status: toAuditPrimitive(doc.status),
        categoryId: toAuditPrimitive(doc.categoryId),
        targetValue: toAuditPrimitive(doc.targetValue),
        currentValue: toAuditPrimitive(doc.currentValue),
        startValue: toAuditPrimitive(doc.startValue),
        deadline: toAuditPrimitive(doc.deadline),
        deletedAt: toAuditPrimitive(doc.deletedAt),
        deletedBy: toAuditPrimitive(doc.deletedBy),
        createdAt: toAuditPrimitive(doc.createdAt),
        updatedAt: toAuditPrimitive(doc.updatedAt),
    };
}

function sanitizeObjectiveCollaborator(doc: object): AuditFieldRecord {
    if (!isJsonObject(doc)) {
        return {};
    }
    return {
        _id: toAuditPrimitive(doc._id),
        objectiveId: toAuditPrimitive(doc.objectiveId),
        userId: toAuditPrimitive(doc.userId),
        organizationId: toAuditPrimitive(doc.organizationId),
        role: toAuditPrimitive(doc.role),
        addedBy: toAuditPrimitive(doc.addedBy),
        createdAt: toAuditPrimitive(doc.createdAt),
    };
}

function sanitizeProgressUpdate(doc: object): AuditFieldRecord {
    if (!isJsonObject(doc)) {
        return {};
    }
    return {
        _id: toAuditPrimitive(doc._id),
        objective: toAuditPrimitive(doc.objective),
        createdBy: toAuditPrimitive(doc.createdBy),
        updatedValue: toAuditPrimitive(doc.updatedValue),
        updateDate: toAuditPrimitive(doc.updateDate),
        createdAt: toAuditPrimitive(doc.createdAt),
        updatedAt: toAuditPrimitive(doc.updatedAt),
    };
}

function sanitizeCategory(doc: object): AuditFieldRecord {
    if (!isJsonObject(doc)) {
        return {};
    }
    return {
        _id: toAuditPrimitive(doc._id),
        userId: toAuditPrimitive(doc.userId),
        organizationId: toAuditPrimitive(doc.organizationId),
        createdAt: toAuditPrimitive(doc.createdAt),
        updatedAt: toAuditPrimitive(doc.updatedAt),
    };
}

function sanitizeUser(doc: object): AuditFieldRecord {
    if (!isJsonObject(doc)) {
        return {};
    }
    return {
        _id: toAuditPrimitive(doc._id),
        role: toAuditPrimitive(doc.role),
        banned: toAuditPrimitive(doc.banned),
        deletedAt: toAuditPrimitive(doc.deletedAt),
        createdAt: toAuditPrimitive(doc.createdAt),
        updatedAt: toAuditPrimitive(doc.updatedAt),
    };
}

function sanitizeDoc(
    table: SanitizedTable,
    doc: object | null | undefined
): AuditFieldRecord | undefined {
    if (!doc) {
        return undefined;
    }
    switch (table) {
        case 'objectives':
            return sanitizeObjective(doc);
        case 'objectiveCollaborators':
            return sanitizeObjectiveCollaborator(doc);
        case 'progressUpdates':
            return sanitizeProgressUpdate(doc);
        case 'categories':
            return sanitizeCategory(doc);
        case 'user':
            return sanitizeUser(doc);
    }
}

type AuditMetadata = {
    before?: AuditFieldRecord;
    after?: AuditFieldRecord;
    context?: string;
};

const toMetadata = <TableName extends SanitizedTable>(
    table: TableName,
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
) => `${resourceType}.${OPERATION_ACTION_SUFFIX[operation]}`;

const registerSimpleTrigger = <
    TableName extends 'objectives' | 'objectiveCollaborators' | 'categories' | 'user',
>(
    registry: Triggers<DataModel, AuditTriggerCtx>,
    tableName: TableName,
    resourceType: AuditResourceType,
    getOrganizationId: (
        ctx: AuditTriggerCtx,
        change: Change<DataModel, TableName>
    ) => Id<'organization'> | null
) => {
    registry.register(tableName, async (ctx, change) => {
        if (!ctx.userId) {
            return;
        }
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
            createdAt: Date.now(),
        });
    });
};

/** Registers audit entries on the shared triggers registry. Internal mutations have no actor
 * and are skipped, so they only run the domain syncs. */
export function registerAuditTriggers(registry: Triggers<DataModel, AuditTriggerCtx>) {
    registerSimpleTrigger(registry, 'objectives', 'objective', (_ctx, change) => {
        return change.newDoc?.organizationId ?? change.oldDoc?.organizationId ?? null;
    });

    registerSimpleTrigger(
        registry,
        'objectiveCollaborators',
        'objective_collaborator',
        (_ctx, change) => {
            return change.newDoc?.organizationId ?? change.oldDoc?.organizationId ?? null;
        }
    );

    registerSimpleTrigger(registry, 'categories', 'category', (_ctx, change) => {
        return change.newDoc?.organizationId ?? change.oldDoc?.organizationId ?? null;
    });

    registerSimpleTrigger(registry, 'user', 'user', ctx => ctx.organizationId ?? null);

    registry.register('progressUpdates', async (ctx, change) => {
        if (!ctx.userId) {
            return;
        }
        const objectiveId = change.newDoc?.objective ?? change.oldDoc?.objective;
        if (!objectiveId) {
            return;
        }

        const objective = await ctx.innerDb.get('objectives', objectiveId);
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
            createdAt: Date.now(),
        });
    });
}
