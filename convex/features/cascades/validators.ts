import { v } from 'convex/values';

export const organizationDeletionPhaseValidator = v.union(
    v.literal('progressUpdates'),
    v.literal('objectives'),
    v.literal('categories'),
    v.literal('audit'),
    v.literal('invitations'),
    v.literal('memberships'),
    v.literal('sessions'),
    v.literal('finalize')
);

export const userDeletionPhaseValidator = v.union(
    v.literal('sessions'),
    v.literal('accounts'),
    v.literal('memberships')
);
