import { internalMutation } from '../../platform/db/internalMutation';
import { v } from 'convex/values';
import { transitionObjective } from '../../domain/objectives/transitions';
import { isOperationalMember } from '../../domain/organizations/operational';
export const syncObjectiveFromProgress = internalMutation({
    args: {
        objectiveId: v.id('objectives'),
        actorUserId: v.optional(v.id('user')),
    },
    returns: v.union(
        v.object({
            found: v.literal(false),
            completedNow: v.boolean(),
            earlyBirdCompletedNow: v.boolean(),
            reopened: v.boolean(),
        }),
        v.object({
            found: v.literal(true),
            completedNow: v.boolean(),
            earlyBirdCompletedNow: v.boolean(),
            reopened: v.boolean(),
            currentValue: v.number(),
            status: v.union(v.literal('active'), v.literal('completed')),
            organizationId: v.id('organization'),
        })
    ),
    handler: async (ctx, args) => {
        const objective = await ctx.db.get('objectives', args.objectiveId);
        // A queued reconciliation may run after an objective was soft-deleted
        // or entered its purge workflow. It must not mutate metrics or recreate
        // notifications for a logically absent objective.
        if (
            !objective ||
            objective.deletedAt !== undefined ||
            objective.purgeToken !== undefined ||
            !(await isOperationalMember(
                ctx,
                objective.organizationId,
                args.actorUserId ?? objective.ownerId
            ))
        ) {
            return {
                found: false as const,
                completedNow: false,
                earlyBirdCompletedNow: false,
                reopened: false,
            };
        }
        const { currentValue, status, completedNow, earlyBirdCompletedNow, reopened } =
            await transitionObjective(ctx, objective._id, {
                actorUserId: args.actorUserId ?? objective.ownerId,
                synchronizeWorkflow: false,
            });
        return {
            found: true as const,
            completedNow,
            earlyBirdCompletedNow,
            reopened,
            currentValue,
            status,
            organizationId: objective.organizationId,
        };
    },
});
