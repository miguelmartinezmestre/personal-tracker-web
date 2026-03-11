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

const toMetadata = <TableName extends TableNamesInDataModel<DataModel>>(
    change: Change<DataModel, TableName>
) => {
    switch (change.operation) {
        case 'insert':
            return {
                after: change.newDoc,
            };
        case 'update':
            return {
                before: change.oldDoc,
                after: change.newDoc,
            };
        case 'delete':
            return {
                before: change.oldDoc,
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
            metadata: toMetadata(change),
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
        metadata: toMetadata(change),
        severity: 'info',
        createdAt: Date.now(),
    });
});

export { triggers as auditLogTriggers };
