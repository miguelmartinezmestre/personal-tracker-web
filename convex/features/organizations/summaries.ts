import type { DatabaseReader } from '../../_generated/server';
import type { Doc, Id } from '../../_generated/dataModel';
import { isPersonalOrganizationForUser } from './personalOrganization';
import { normalizeOrganizationRole } from './roles';
import { z } from 'zod';

const organizationMetadataSchema = z.looseObject({ description: z.string().optional() });

function parseOrganizationDescription(metadata: string): string | undefined {
    try {
        const parsed: unknown = JSON.parse(metadata);
        const result = organizationMetadataSchema.safeParse(parsed);

        return result.success ? result.data.description : undefined;
    } catch {
        return undefined;
    }
}

export function getOrganizationDescription(metadata: string | null | undefined): string {
    if (!metadata) {
        return '';
    }

    return parseOrganizationDescription(metadata) ?? '';
}

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
                description: getOrganizationDescription(org.metadata),
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
