export const resolveActorUserId = (
    userId: string,
    actorUserId: string | null | undefined
): string | undefined => (actorUserId && actorUserId !== userId ? actorUserId : undefined);
