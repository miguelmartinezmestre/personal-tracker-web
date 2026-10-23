import type { DatabaseReader } from '../../_generated/server';
import type { Doc, Id } from '../../_generated/dataModel';
import { isPersonalOrganizationForUser } from './personalOrganization';
import { normalizeOrganizationRole } from './roles';

export async function toOrganizationSummaries(
    ctx: { dbForIntegrityChecks: DatabaseReader; userId: Id<'user'> },
    memberships: Doc<'member'>[]
) {
    const organizations = await Promise.all(
        memberships.map(async member => {
            // An organization being deleted loses its row before its memberships.
            const org = await ctx.dbForIntegrityChecks.get('organization', member.organizationId);

            if (!org) {
                return null;
            }

            return {
                id: org._id,
                name: org.name,
                slug: org.slug,
                logo: org.logo,
                createdAt: org.createdAt,
                role: normalizeOrganizationRole(member.role),
                isPersonal: isPersonalOrganizationForUser({
                    metadata: org.metadata,
                    userId: ctx.userId,
                }),
            };
        })
    );

    return organizations.filter(organization => organization !== null);
}
