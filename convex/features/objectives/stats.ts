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

/**
 * Per-organization counts and progress sums of objectives, keyed by [status, categoryId] so the
 * dashboard can read totals, completed counts and per-category stats without scanning the table.
 */
export const objectiveStats = new TableAggregate<{
    Namespace: Id<'organization'>;
    Key: [Doc<'objectives'>['status'], Id<'categories'> | null];
    DataModel: DataModel;
    TableName: 'objectives';
}>(components.objectiveStats, {
    namespace: doc => doc.organizationId,
    sortKey: doc => [doc.status, doc.categoryId ?? null],
    sumValue: doc => progressPercent(doc),
});

const triggers = new Triggers<DataModel>();

triggers.register('objectives', objectiveStats.idempotentTrigger());

// Every objective write must go through these builders so the aggregate never drifts.
export const mutation = customMutation(rawMutation, customCtx(triggers.wrapDB));
export const internalMutation = customMutation(rawInternalMutation, customCtx(triggers.wrapDB));
