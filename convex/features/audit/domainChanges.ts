import type { Change } from 'convex-helpers/server/triggers';
import type { DataModel, Doc, Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';
import { isResultingValueRecalculation } from '../objectives/progress';
import { insertAuditLog, type AuditRecord } from './log';

const VERBS = { insert: 'created', update: 'updated', delete: 'deleted' } as const;

async function recordChange(
    ctx: MutationCtx,
    change: { operation: keyof typeof VERBS; id: string },
    resourceType: string,
    subject: { userId?: Id<'user'>; organizationId: Id<'organization'> },
    metadata: { before?: AuditRecord; after?: AuditRecord }
) {
    if (!subject.userId) {
        return;
    }

    await insertAuditLog(ctx, {
        action: `${resourceType}.${VERBS[change.operation]}`,
        resourceType,
        resourceId: change.id,
        userId: subject.userId,
        organizationId: subject.organizationId,
        severity: change.operation === 'delete' ? 'warning' : 'info',
        metadata,
    });
}

// Titles, comments and names are free text, so only ids, numbers and states are kept.
const sanitizeObjective = (objective: Doc<'objectives'>) =>
    ({
        status: objective.status,
        direction: objective.direction,
        startValue: objective.startValue,
        currentValue: objective.currentValue,
        targetValue: objective.targetValue,
        memberCanView: objective.memberCanView,
        memberCanEdit: objective.memberCanEdit,
        deadline: objective.deadline ?? null,
        deletedAt: objective.deletedAt ?? null,
    }) satisfies AuditRecord;

const sanitizeProgress = (entry: Doc<'progressUpdates'>) =>
    ({
        objective: entry.objective,
        updatedValue: entry.updatedValue,
        updateDate: entry.updateDate,
    }) satisfies AuditRecord;

export async function auditObjectiveChange(
    ctx: MutationCtx,
    change: Change<DataModel, 'objectives'>
) {
    const doc = change.newDoc ?? change.oldDoc;

    await recordChange(
        ctx,
        change,
        'objective',
        { userId: doc.createdBy, organizationId: doc.organizationId },
        {
            before: change.oldDoc ? sanitizeObjective(change.oldDoc) : undefined,
            after: change.newDoc ? sanitizeObjective(change.newDoc) : undefined,
        }
    );
}

export async function auditProgressChange(
    ctx: MutationCtx,
    change: Change<DataModel, 'progressUpdates'>
) {
    if (isResultingValueRecalculation(change)) {
        return;
    }

    const doc = change.newDoc ?? change.oldDoc;

    await recordChange(
        ctx,
        change,
        'progress',
        { userId: doc.createdBy, organizationId: doc.organizationId },
        {
            before: change.oldDoc ? sanitizeProgress(change.oldDoc) : undefined,
            after: change.newDoc ? sanitizeProgress(change.newDoc) : undefined,
        }
    );
}

export async function auditCategoryChange(
    ctx: MutationCtx,
    change: Change<DataModel, 'categories'>
) {
    const doc = change.newDoc ?? change.oldDoc;

    await recordChange(
        ctx,
        change,
        'category',
        { userId: doc.userId, organizationId: doc.organizationId },
        {
            before: change.oldDoc ? { color: change.oldDoc.color } : undefined,
            after: change.newDoc ? { color: change.newDoc.color } : undefined,
        }
    );
}
