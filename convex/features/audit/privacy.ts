import type { Id } from '../../_generated/dataModel';

export const resolveActorUserId = (
    userId: Id<'user'>,
    actorUserId: Id<'user'> | null | undefined
): Id<'user'> | undefined => (actorUserId && actorUserId !== userId ? actorUserId : undefined);
