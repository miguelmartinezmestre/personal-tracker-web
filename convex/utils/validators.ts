import { v } from 'convex/values';
import { ORGANIZATION_ROLE } from '../../shared/organization-roles';

export const organizationRoleValidator = v.union(
    v.literal(ORGANIZATION_ROLE.OWNER),
    v.literal(ORGANIZATION_ROLE.ADMIN),
    v.literal(ORGANIZATION_ROLE.MEMBER)
);
import {
    OBJECTIVE_STATUS,
    OBJECTIVE_VISIBILITY,
    OBJECTIVE_COLLABORATOR_ROLE,
    NOTIFICATION_TYPE,
    ACHIEVEMENT_TYPE,
    ACHIEVEMENT_CATEGORY,
    ACHIEVEMENT_TIER,
} from './constants';

export const objectiveStatusValidator = v.union(
    v.literal(OBJECTIVE_STATUS.ACTIVE),
    v.literal(OBJECTIVE_STATUS.COMPLETED)
);

export const objectiveVisibilityValidator = v.union(
    v.literal(OBJECTIVE_VISIBILITY.PRIVATE),
    v.literal(OBJECTIVE_VISIBILITY.ORGANIZATION)
);

export const objectiveCollaboratorRoleValidator = v.union(
    v.literal(OBJECTIVE_COLLABORATOR_ROLE.EDITOR),
    v.literal(OBJECTIVE_COLLABORATOR_ROLE.VIEWER)
);

export const notificationTypeValidator = v.union(
    v.literal(NOTIFICATION_TYPE.DEADLINE),
    v.literal(NOTIFICATION_TYPE.PROGRESS),
    v.literal(NOTIFICATION_TYPE.STATUS),
    v.literal(NOTIFICATION_TYPE.ACHIEVEMENT)
);

export const achievementTypeValidator = v.union(
    v.literal(ACHIEVEMENT_TYPE.INDIVIDUAL),
    v.literal(ACHIEVEMENT_TYPE.ORGANIZATION)
);

export const achievementCategoryValidator = v.union(
    v.literal(ACHIEVEMENT_CATEGORY.MILESTONE),
    v.literal(ACHIEVEMENT_CATEGORY.STREAK),
    v.literal(ACHIEVEMENT_CATEGORY.COMPLETION),
    v.literal(ACHIEVEMENT_CATEGORY.ACTIVITY)
);

export const achievementTierValidator = v.union(
    v.literal(ACHIEVEMENT_TIER.BRONZE),
    v.literal(ACHIEVEMENT_TIER.SILVER),
    v.literal(ACHIEVEMENT_TIER.GOLD)
);

export const achievementTriggerValidator = v.union(
    v.literal('objective_created'),
    v.literal('objective_completed'),
    v.literal('progress_update')
);
