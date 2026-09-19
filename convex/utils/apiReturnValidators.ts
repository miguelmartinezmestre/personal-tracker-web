import { v } from 'convex/values';
import { paginationResultValidator } from 'convex/server';
import {
    achievementDefinitionDocumentValidator,
    auditLogDocumentValidator,
    notificationDocumentValidator,
    objectiveDocumentValidator,
    userDocumentValidator,
} from './documentValidators';
import {
    objectiveCollaboratorRoleValidator,
    objectiveStatusValidator,
    organizationRoleValidator,
} from './validators';

export const objectiveCapabilitiesValidator = v.object({
    canView: v.boolean(),
    canEditDefinition: v.boolean(),
    canDelete: v.boolean(),
    canRestore: v.boolean(),
    canPurge: v.boolean(),
    canManageCollaborators: v.boolean(),
    canContribute: v.boolean(),
    canSetVisibility: v.boolean(),
    canTransfer: v.boolean(),
});

export const objectiveWithCapabilitiesValidator = v.object({
    _id: v.id('objectives'),
    _creationTime: v.number(),
    organizationId: v.id('organization'),
    createdBy: v.id('user'),
    ownerId: v.id('user'),
    visibility: v.union(v.literal('private'), v.literal('organization')),
    title: v.string(),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id('categories')),
    targetValue: v.number(),
    currentValue: v.number(),
    startValue: v.optional(v.number()),
    deadline: v.optional(v.number()),
    status: objectiveStatusValidator,
    completedAt: v.optional(v.number()),
    earlyBirdCompleted: v.optional(v.boolean()),
    unit: v.optional(v.string()),
    deletedAt: v.optional(v.number()),
    deletedBy: v.optional(v.id('user')),
    purgeToken: v.optional(v.string()),
    purgeStartedAt: v.optional(v.number()),
    ownerDeletionProcessedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    capabilities: objectiveCapabilitiesValidator,
});

export const paginatedObjectivesValidator = v.object({
    ...paginationResultValidator(objectiveWithCapabilitiesValidator).fields,
    needsContinuation: v.optional(v.boolean()),
});

export const paginatedUsersValidator = paginationResultValidator(userDocumentValidator);

export const paginatedAuditLogsValidator = paginationResultValidator(auditLogDocumentValidator);

export const paginatedNotificationsValidator = paginationResultValidator(
    notificationDocumentValidator
);

export const sessionListItemValidator = v.object({
    _id: v.id('session'),
    createdAt: v.number(),
    expiresAt: v.number(),
    ipAddress: v.union(v.string(), v.null()),
    userAgent: v.union(v.string(), v.null()),
    isCurrent: v.boolean(),
});

export const paginatedSessionsValidator = paginationResultValidator(sessionListItemValidator);

export const objectiveCollaboratorDocumentValidator = v.object({
    _id: v.id('objectiveCollaborators'),
    _creationTime: v.number(),
    objectiveId: v.id('objectives'),
    userId: v.id('user'),
    organizationId: v.id('organization'),
    role: objectiveCollaboratorRoleValidator,
    addedBy: v.id('user'),
    createdAt: v.number(),
});

export const collaboratorEnrichedValidator = v.object({
    id: v.id('objectiveCollaborators'),
    objectiveId: v.id('objectives'),
    userId: v.id('user'),
    role: objectiveCollaboratorRoleValidator,
    addedBy: v.id('user'),
    createdAt: v.number(),
    user: v.union(
        v.null(),
        v.object({
            name: v.string(),
            email: v.string(),
            image: v.optional(v.union(v.null(), v.string())),
        })
    ),
});

export const userAchievementWithDefinitionValidator = v.object({
    _id: v.id('obtainedAchievements'),
    _creationTime: v.number(),
    userId: v.id('user'),
    achievement: v.string(),
    earnedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    definition: v.optional(achievementDefinitionDocumentValidator),
    user: v.id('user'),
});

export const organizationAchievementWithDefinitionValidator = v.object({
    _id: v.id('organizationAchievements'),
    _creationTime: v.number(),
    organization: v.id('organization'),
    achievement: v.string(),
    earnedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    definition: v.optional(achievementDefinitionDocumentValidator),
});

export const achievementStatsValidator = v.object({
    totalPoints: v.number(),
    earnedCount: v.number(),
    totalAvailable: v.number(),
});

export const achievementProgressItemValidator = v.object({
    definition: achievementDefinitionDocumentValidator,
    currentProgress: v.number(),
    isEarned: v.boolean(),
    earnedAt: v.optional(v.number()),
});

export const organizationSummaryValidator = v.object({
    id: v.id('organization'),
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    logo: v.optional(v.union(v.null(), v.string())),
    createdAt: v.number(),
    role: organizationRoleValidator,
    isPersonal: v.boolean(),
});

export const activeOrganizationValidator = v.object({
    id: v.id('organization'),
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    logo: v.optional(v.union(v.null(), v.string())),
    createdAt: v.number(),
});

export const activeMemberValidator = v.object({
    id: v.id('member'),
    organizationId: v.id('organization'),
    userId: v.id('user'),
    role: organizationRoleValidator,
    createdAt: v.number(),
});

export const organizationMemberValidator = v.object({
    id: v.id('member'),
    organizationId: v.id('organization'),
    userId: v.id('user'),
    role: organizationRoleValidator,
    createdAt: v.number(),
    user: v.union(
        v.null(),
        v.object({
            email: v.string(),
            name: v.string(),
            image: v.optional(v.union(v.null(), v.string())),
        })
    ),
});

export const paginatedOrganizationMembersValidator = paginationResultValidator(
    organizationMemberValidator
);

export const invitationOrganizationSummaryValidator = v.object({
    id: v.id('organization'),
    name: v.string(),
    slug: v.string(),
});

export const invitationInviterSummaryValidator = v.object({
    id: v.id('user'),
    name: v.string(),
    email: v.string(),
});

export const userInvitationValidator = v.object({
    id: v.id('invitation'),
    email: v.string(),
    role: v.string(),
    organizationId: v.id('organization'),
    status: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    organization: v.optional(invitationOrganizationSummaryValidator),
    inviter: v.optional(invitationInviterSummaryValidator),
});

export const organizationInvitationValidator = v.object({
    id: v.id('invitation'),
    email: v.string(),
    role: v.string(),
    organizationId: v.id('organization'),
    status: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    inviter: v.optional(invitationInviterSummaryValidator),
});

export const currentSessionValidator = v.object({
    session: v.object({
        id: v.id('session'),
        userId: v.string(),
        expiresAt: v.number(),
        activeOrganizationId: v.union(v.id('organization'), v.null()),
        createdAt: v.number(),
    }),
    user: v.union(
        v.null(),
        v.object({
            id: v.id('user'),
            name: v.string(),
            email: v.string(),
            image: v.optional(v.union(v.null(), v.string())),
            emailVerified: v.boolean(),
        })
    ),
});

export const successResultValidator = v.object({
    success: v.boolean(),
});

export const paginatedObjectivesArrayValidator = v.array(objectiveWithCapabilitiesValidator);

export const objectivesArrayValidator = v.array(objectiveDocumentValidator);
