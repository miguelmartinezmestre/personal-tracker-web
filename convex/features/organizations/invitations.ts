import type { PaginationOptions } from 'convex/server';
import {
    deleteWhere,
    findOne,
    findPage,
    type AuthDoc,
    type AuthReader,
    type AuthWriter,
} from '../auth/authStore';
import { getInvitation, getMembership, getOrganization, getUser } from '../auth/authRecords';
import { normalizeRegistrationEmail } from '../auth/users';
import { isOrganizationAdminRole } from './roles';

// Date.now() stays out of the index range (a moving bound invalidates the cursor): rows are read
// newest expiry first and the list ends at the first expired one.
const LATEST_EXPIRY_FIRST = { field: 'expiresAt', direction: 'desc' } as const;

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

export async function listInvitationsForUser(
    ctx: AuthReader,
    userId: string,
    paginationOpts: PaginationOptions
) {
    const user = await getUser(ctx, userId);

    if (!user?.emailVerified) {
        return { page: [], isDone: true, continueCursor: '' };
    }

    const now = Date.now();

    const result = await findPage(ctx, 'invitation', {
        where: [
            { field: 'email', value: user.email },
            { field: 'status', value: 'pending' },
        ],
        sortBy: LATEST_EXPIRY_FIRST,
        paginationOpts,
        isLive: invitation => invitation.expiresAt > now,
    });

    const page = await Promise.all(
        result.page.map(async invitation => {
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

    return { ...result, page: page.filter(invitation => invitation !== null) };
}

export async function listPendingInvitationsForOrganization(
    ctx: AuthReader,
    args: { organizationId: string; requesterId: string; paginationOpts: PaginationOptions }
) {
    const membership = await getMembership(ctx, args.organizationId, args.requesterId);

    if (!membership || !isOrganizationAdminRole(membership.role)) {
        return { page: [], isDone: true, continueCursor: '' };
    }

    const now = Date.now();

    const result = await findPage(ctx, 'invitation', {
        where: [
            { field: 'organizationId', value: args.organizationId },
            { field: 'status', value: 'pending' },
        ],
        sortBy: LATEST_EXPIRY_FIRST,
        paginationOpts: args.paginationOpts,
        isLive: invitation => invitation.expiresAt > now,
    });

    return {
        ...result,
        page: result.page.map((invitation: AuthDoc<'invitation'>) => ({
            id: invitation._id,
            email: invitation.email,
            role: invitation.role || 'member',
            expiresAt: invitation.expiresAt,
        })),
    };
}

export async function deleteInvitationsForOrganizationBatch(
    ctx: AuthWriter,
    organizationId: string,
    batchSize: number
) {
    const { count } = await deleteWhere(
        ctx,
        'invitation',
        [{ field: 'organizationId', value: organizationId }],
        batchSize
    );

    return count;
}

export async function hasInvitations(ctx: AuthReader, organizationId: string) {
    return (
        (await findOne(ctx, 'invitation', [{ field: 'organizationId', value: organizationId }])) !==
        null
    );
}
