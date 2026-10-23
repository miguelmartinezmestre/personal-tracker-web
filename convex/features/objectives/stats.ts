import { TableAggregate } from '@convex-dev/aggregate';
import { customCtx, customMutation } from 'convex-helpers/server/customFunctions';
import { Triggers } from 'convex-helpers/server/triggers';
import { components } from '../../_generated/api';
import type { DataModel, Doc, Id } from '../../_generated/dataModel';
import {
    internalMutation as rawInternalMutation,
    mutation as rawMutation,
} from '../../_generated/server';
import { progressPercent } from './records';
import {
    auditCategoryChange,
    auditObjectiveChange,
    auditProgressChange,
} from '../audit/domainChanges';
import { notifyObjectiveProgress } from '../notifications/delivery';
import {
    evaluateObjectiveAchievements,
    evaluateProgressAchievements,
} from '../achievements/triggers';

/**
 * Per-organization counts and progress sums of objectives, keyed by [inTrash, memberCanView,
 * status, categoryId] so the dashboard can read totals, completed counts and per-category stats
 * without scanning the table, leaving the trash out and private objectives apart (P10).
 */
export const objectiveStats = new TableAggregate<{
    Namespace: Id<'organization'>;
    Key: [boolean, boolean, Doc<'objectives'>['status'], Id<'categories'> | null];
    DataModel: DataModel;
    TableName: 'objectives';
}>(components.objectiveStats, {
    namespace: doc => doc.organizationId,
    sortKey: doc => [
        doc.deletedAt !== undefined,
        doc.memberCanView,
        doc.status,
        doc.categoryId ?? null,
    ],
    sumValue: doc => progressPercent(doc),
});

// Objectives by progress within the same visibility groups, for the dashboard ranking.
export const objectiveRanking = new TableAggregate<{
    Namespace: Id<'organization'>;
    Key: [boolean, boolean, number];
    DataModel: DataModel;
    TableName: 'objectives';
}>(components.objectiveRanking, {
    namespace: doc => doc.organizationId,
    sortKey: doc => [doc.deletedAt !== undefined, doc.memberCanView, progressPercent(doc)],
});

const triggers = new Triggers<DataModel>();

triggers.register('objectives', objectiveStats.idempotentTrigger());

triggers.register('objectives', objectiveRanking.idempotentTrigger());

triggers.register('objectives', auditObjectiveChange);

triggers.register('progressUpdates', auditProgressChange);

triggers.register('categories', auditCategoryChange);

triggers.register('objectives', notifyObjectiveProgress);

triggers.register('objectives', evaluateObjectiveAchievements);

triggers.register('progressUpdates', evaluateProgressAchievements);

// Every write to these tables must go through these builders so the aggregates never drift and
// the audit log misses nothing.
export const mutation = customMutation(rawMutation, customCtx(triggers.wrapDB));
export const internalMutation = customMutation(rawInternalMutation, customCtx(triggers.wrapDB));
