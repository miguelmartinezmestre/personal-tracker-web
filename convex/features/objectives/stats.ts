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

export const objectiveStats = new TableAggregate<{
    Namespace: string;
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

export const objectiveRanking = new TableAggregate<{
    Namespace: string;
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

// Every write to these tables must go through these builders, or aggregates and audit log drift.
export const mutation = customMutation(rawMutation, customCtx(triggers.wrapDB));
export const internalMutation = customMutation(rawInternalMutation, customCtx(triggers.wrapDB));
