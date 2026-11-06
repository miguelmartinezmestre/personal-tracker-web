import type { Doc } from '../../_generated/dataModel';
import { rlsAllow, rlsDeny, rlsWhen, type RlsHelpers, type RlsInsertDoc } from './rlsHelpers';

type QueryLike = RlsHelpers['ctx'];

/**
 * The Better Auth tables stay outside row-level security: they are reached only through the
 * auth modules, and every caller checks access itself, as it will once they live in a component.
 */
const OUTSIDE_RLS = { read: rlsAllow, insert: rlsAllow, modify: rlsAllow };

export function organizationTableRules(helpers: RlsHelpers) {
    const { userId, isGlobalAdmin, isActiveOrganization, isMemberOfOrganization } = helpers;

    return {
        user: OUTSIDE_RLS,
        session: OUTSIDE_RLS,
        organization: OUTSIDE_RLS,
        member: OUTSIDE_RLS,
        invitation: OUTSIDE_RLS,
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
