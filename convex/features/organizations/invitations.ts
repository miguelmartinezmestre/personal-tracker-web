import type { PaginationOptions, PaginationResult } from 'convex/server';
import type { Doc } from '../../_generated/dataModel';
import { withNextPageCheck, withPaginationLimits } from '../../shared/pagination';
import {
    getInvitation,
    getMembership,
    getOrganization,
    getUser,
    type AuthReader,
    type AuthWriter,
} from '../auth/authRecords';
import { normalizeRegistrationEmail } from '../auth/users';
import { isOrganizationAdminRole } from './roles';

const EMPTY_PAGE = { page: [], isDone: true, continueCursor: '' };

export async function getInvitationPublicStatus(ctx: AuthReader, invitationId: string) {
    const invitation = await getInvitation(ctx, invitationId);

    if (!invitation || invitation.status !== 'pending' || invitation.expiresAt <= Date.now()) {
        return { isValid: false };
    }

    const organization = await getOrganization(ctx, invitation.organizationId);

    return organization
        ? { isValid: true, organizationName: organization.name }
        : { isValid: false };
}

/** Whether a pending, unexpired invitation for this email lets it register. */
export async function invitationAllowsRegistration(
    ctx: AuthReader,
    args: { email: string; invitationId: string; now: number }
) {
    const normalizedEmail = normalizeRegistrationEmail(args.email);
    const invitation = await getInvitation(ctx, args.invitationId);

    if (
        !normalizedEmail ||
        !invitation ||
        invitation.status !== 'pending' ||
        invitation.expiresAt <= args.now ||
        normalizeRegistrationEmail(invitation.email) !== normalizedEmail
    ) {
        return false;
    }

    return (await getOrganization(ctx, invitation.organizationId)) !== null;
}

/**
 * Date.now() stays out of the index range (a moving bound invalidates the cursor): rows are read
 * newest expiry first and the list ends at the first expired one.
 */
function liveInvitations(result: PaginationResult<Doc<'invitation'>>, now: number) {
    const live = result.page.filter(invitation => invitation.expiresAt > now);

    return {
        live,
        result: { ...result, isDone: result.isDone || live.length < result.page.length },
    };
}

export async function listInvitationsForUser(
    ctx: AuthReader,
    userId: string,
    paginationOpts: PaginationOptions
) {
    const user = await getUser(ctx, userId);

    if (!user?.emailVerified) {
        return EMPTY_PAGE;
    }

    const { email } = user;
    const now = Date.now();

    const { live, result } = liveInvitations(
        await ctx.db
            .query('invitation')
            .withIndex('by_email_status_expiresAt', q =>
                q.eq('email', email).eq('status', 'pending')
            )
            .order('desc')
            .paginate(withPaginationLimits(paginationOpts)),
        now
    );

    const page = await Promise.all(
        live.map(async invitation => {
            const [organization, inviter] = await Promise.all([
                getOrganization(ctx, invitation.organizationId),
                getUser(ctx, invitation.inviterId),
            ]);

            if (!organization) {
                return null;
            }

            return {
                id: invitation._id,
                email: invitation.email,
                role: invitation.role || 'member',
                organizationId: invitation.organizationId,
                organization: { name: organization.name },
                inviter: inviter ? { name: inviter.name } : undefined,
            };
        })
    );

    return await withNextPageCheck(
        ctx.db,
        {
            table: 'invitation',
            index: 'by_email_status_expiresAt',
            prefix: [email, 'pending'],
            indexKey: doc => [doc.email, doc.status, doc.expiresAt],
            paginationOpts,
            isLive: doc => doc.expiresAt > now,
        },
        result,
        page.filter(invitation => invitation !== null)
    );
}

export async function listPendingInvitationsForOrganization(
    ctx: AuthReader,
    args: { organizationId: string; requesterId: string; paginationOpts: PaginationOptions }
) {
    const organizationId = ctx.db.normalizeId('organization', args.organizationId);

    const membership = organizationId
        ? await getMembership(ctx, organizationId, args.requesterId)
        : null;

    if (!organizationId || !membership || !isOrganizationAdminRole(membership.role)) {
        return EMPTY_PAGE;
    }

    const now = Date.now();

    const { live, result } = liveInvitations(
        await ctx.db
            .query('invitation')
            .withIndex('by_organizationId_status_expiresAt', q =>
                q.eq('organizationId', organizationId).eq('status', 'pending')
            )
            .order('desc')
            .paginate(withPaginationLimits(args.paginationOpts)),
        now
    );

    return await withNextPageCheck(
        ctx.db,
        {
            table: 'invitation',
            index: 'by_organizationId_status_expiresAt',
            prefix: [organizationId, 'pending'],
            indexKey: doc => [doc.organizationId, doc.status, doc.expiresAt],
            paginationOpts: args.paginationOpts,
            isLive: doc => doc.expiresAt > now,
        },
        result,
        live.map(invitation => ({
            id: invitation._id,
            email: invitation.email,
            role: invitation.role || 'member',
            expiresAt: invitation.expiresAt,
        }))
    );
}

export async function deleteInvitationsForOrganizationBatch(
    ctx: AuthWriter,
    organizationId: string,
    batchSize: number
) {
    const id = ctx.db.normalizeId('organization', organizationId);

    if (!id) {
        return 0;
    }

    const rows = await ctx.db
        .query('invitation')
        .withIndex('organizationId', q => q.eq('organizationId', id))
        .take(batchSize);

    for (const row of rows) {
        await ctx.db.delete('invitation', row._id);
    }

    return rows.length;
}

export async function hasInvitations(ctx: AuthReader, organizationId: string) {
    const id = ctx.db.normalizeId('organization', organizationId);

    if (!id) {
        return false;
    }

    const invitation = await ctx.db
        .query('invitation')
        .withIndex('organizationId', q => q.eq('organizationId', id))
        .first();

    return invitation !== null;
}
