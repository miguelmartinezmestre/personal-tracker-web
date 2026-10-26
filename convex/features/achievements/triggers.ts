import type { Change } from 'convex-helpers/server/triggers';
import { internal } from '../../_generated/api';
import type { DataModel } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';
import { isResultingValueRecalculation } from '../objectives/progress';
import { isEarlyBirdCompletion } from './metrics';

export async function evaluateObjectiveAchievements(
    ctx: MutationCtx,
    change: Change<DataModel, 'objectives'>
) {
    const objective = change.newDoc;
    const isCompletion = change.oldDoc?.status === 'active' && objective?.status === 'completed';

    if (objective && (change.operation === 'insert' || isCompletion)) {
        await ctx.scheduler.runAfter(0, internal.achievements.evaluateAchievements, {
            userId: objective.createdBy,
            organizationId: objective.organizationId,
            isEarlyBird: isCompletion && isEarlyBirdCompletion(objective),
        });
    }
}

export async function evaluateProgressAchievements(
    ctx: MutationCtx,
    change: Change<DataModel, 'progressUpdates'>
) {
    if (change.newDoc && !isResultingValueRecalculation(change)) {
        await ctx.scheduler.runAfter(0, internal.achievements.evaluateAchievements, {
            userId: change.newDoc.createdBy,
            organizationId: change.newDoc.organizationId,
            isEarlyBird: false,
        });
    }
}
