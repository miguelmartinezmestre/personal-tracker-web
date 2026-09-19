import { Triggers } from 'convex-helpers/server/triggers';
import type { DataModel } from '../../_generated/dataModel';
import {
    syncCollaboratorEntries,
    syncObjectiveEntries,
    syncProgressEntries,
} from '../../domain/dashboard/sync';
import { registerAuditTriggers, type AuditTriggerCtx } from '../audit/triggers';

/** The single triggers registry: dashboard syncs for every mutation, audit entries for the
 * mutations that carry an actor. */
export const domainTriggers = new Triggers<DataModel, AuditTriggerCtx>();

domainTriggers.register('objectives', (ctx, change) =>
    syncObjectiveEntries({ ...ctx, db: ctx.innerDb }, change.oldDoc, change.newDoc)
);
domainTriggers.register('objectiveCollaborators', (ctx, change) =>
    syncCollaboratorEntries({ ...ctx, db: ctx.innerDb }, change.oldDoc, change.newDoc)
);
domainTriggers.register('progressUpdates', (ctx, change) =>
    syncProgressEntries({ ...ctx, db: ctx.innerDb }, change.oldDoc, change.newDoc)
);

registerAuditTriggers(domainTriggers);
