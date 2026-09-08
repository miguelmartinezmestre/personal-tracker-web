import { Triggers } from 'convex-helpers/server/triggers';
import type { DataModel } from '../../_generated/dataModel';
import {
    syncCollaboratorEntries,
    syncObjectiveEntries,
    syncProgressEntries,
} from '../../domain/dashboard/sync';

export const domainTriggers = new Triggers<DataModel>();
domainTriggers.register('objectives', (ctx, change) =>
    syncObjectiveEntries({ ...ctx, db: ctx.innerDb }, change.oldDoc, change.newDoc)
);
domainTriggers.register('objectiveCollaborators', (ctx, change) =>
    syncCollaboratorEntries({ ...ctx, db: ctx.innerDb }, change.oldDoc, change.newDoc)
);
domainTriggers.register('progressUpdates', (ctx, change) =>
    syncProgressEntries({ ...ctx, db: ctx.innerDb }, change.oldDoc, change.newDoc)
);
