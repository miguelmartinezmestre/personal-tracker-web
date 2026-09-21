import { v } from 'convex/values';
import { internalMutation } from './_generated/server';
import {
    continueOrganizationDeletionCascade as continueOrganizationDeletionCascadeJob,
    startOrganizationDeletionCascade,
    type OrganizationDeletionPhase,
} from './jobs/organizations/cascadeDeletion';
import {
    continueMemberLeaveCleanup as continueMemberLeaveCleanupJob,
    type MemberLeaveCleanupPhase,
} from './jobs/organizations/memberLeaveCleanup';
import {
    continueUserDeletionCascade as continueUserDeletionCascadeJob,
    startUserDeletionCascade,
    type UserDeletionPhase,
} from './jobs/users/cascadeDeletion';
import type { Id } from './_generated/dataModel';

const organizationDeletionPhaseValidator = v.union(
    v.literal('categories'),
    v.literal('audit'),
    v.literal('invitations'),
    v.literal('memberships'),
    v.literal('sessions'),
    v.literal('finalize')
);

const userDeletionPhaseValidator = v.union(
    v.literal('sessions'),
    v.literal('accounts'),
    v.literal('memberships')
);

const memberLeaveCleanupPhaseValidator = v.union(v.literal('done'));

export const cascadeUserDeletionInternal = internalMutation({
    args: {
        userId: v.id('user'),
        actorUserId: v.optional(v.id('user')),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        await startUserDeletionCascade(ctx, args.userId);
        return null;
    },
});

export const continueUserDeletionCascade = internalMutation({
    args: {
        userId: v.id('user'),
        phase: v.optional(userDeletionPhaseValidator),
    },
    returns: v.object({
        status: v.union(v.literal('in_progress'), v.literal('completed')),
        phase: userDeletionPhaseValidator,
    }),
    handler: async (ctx, args) => {
        return await continueUserDeletionCascadeJob(ctx, {
            userId: args.userId,
            phase: args.phase as UserDeletionPhase | undefined,
        });
    },
});

export const cascadeOrganizationDeletionInternal = internalMutation({
    args: {
        organizationId: v.id('organization'),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        await startOrganizationDeletionCascade(ctx, args.organizationId);
        return null;
    },
});

export const continueOrganizationDeletionCascade = internalMutation({
    args: {
        organizationId: v.id('organization'),
        phase: v.optional(organizationDeletionPhaseValidator),
    },
    returns: v.object({
        status: v.union(v.literal('in_progress'), v.literal('completed')),
        phase: organizationDeletionPhaseValidator,
    }),
    handler: async (ctx, args) => {
        return await continueOrganizationDeletionCascadeJob(ctx, {
            organizationId: args.organizationId,
            phase: args.phase as OrganizationDeletionPhase | undefined,
        });
    },
});

export const continueMemberLeaveCleanup = internalMutation({
    args: {
        organizationId: v.id('organization'),
        userId: v.id('user'),
        phase: v.optional(memberLeaveCleanupPhaseValidator),
    },
    returns: v.object({
        status: v.union(v.literal('in_progress'), v.literal('completed')),
        phase: memberLeaveCleanupPhaseValidator,
    }),
    handler: async (ctx, args) => {
        return await continueMemberLeaveCleanupJob(ctx, {
            organizationId: args.organizationId as Id<'organization'>,
            userId: args.userId as Id<'user'>,
            phase: args.phase as MemberLeaveCleanupPhase | undefined,
        });
    },
});
