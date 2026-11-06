import type { Doc } from '../../_generated/dataModel';
import { rlsAllow, rlsDeny, rlsWhen, type RlsHelpers, type RlsInsertDoc } from './rlsHelpers';

type QueryLike = RlsHelpers['ctx'];

export function organizationTableRules(helpers: RlsHelpers) {
    const { userId, isGlobalAdmin, isActiveOrganization, isMemberOfOrganization } = helpers;

    return {
        categories: {
            read: (_ctx: QueryLike, category: Doc<'categories'>) =>
                rlsWhen(isActiveOrganization(category.organizationId)),
            insert: async (_ctx: QueryLike, category: RlsInsertDoc<'categories'>) =>
                isActiveOrganization(category.organizationId) ||
                (await isMemberOfOrganization(category.organizationId)),
            modify: (_ctx: QueryLike, category: Doc<'categories'>) =>
                rlsWhen(
                    isActiveOrganization(category.organizationId) &&
                        (category.userId === userId ||
                            helpers.hasActiveOrgAdminAccess(category.organizationId))
                ),
        },
        platformCategories: {
            read: rlsAllow,
            insert: () => rlsWhen(isGlobalAdmin),
            modify: () => rlsWhen(isGlobalAdmin),
        },
        auditLogs: {
            read: () => rlsWhen(isGlobalAdmin),
            insert: rlsAllow,
            modify: rlsDeny,
        },
        platformSettings: {
            read: () => rlsWhen(isGlobalAdmin),
            insert: rlsDeny,
            modify: rlsDeny,
        },
    };
}
