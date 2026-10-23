import { internal } from '../../_generated/api';
import type { MutationCtx } from '../../_generated/server';
import type { Triggers as BetterAuthTriggers } from 'kitcn/auth';
import { requireMutationCtx, type GenericCtx } from '../../shared/ctx';
import type schema from '../../schema';
import type { DataModel, Doc } from '../../_generated/dataModel';
import { insertAuditLog, type AuditEntry, type AuditRecord } from './log';

type BetterAuthSchema = typeof schema;

const sanitizeSession = (session: Doc<'session'>) =>
    ({
        _id: session._id,
        userId: session.userId,
        activeOrganizationId: session.activeOrganizationId ?? null,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
    }) satisfies AuditRecord;

const sanitizeUser = (user: Doc<'user'>) =>
    ({
        _id: user._id,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        role: user.role ?? null,
        banned: user.banned ?? null,
        banExpires: user.banExpires ?? null,
        deletedAt: user.deletedAt ?? null,
    }) satisfies AuditRecord;

const sanitizeInvitation = (invitation: Doc<'invitation'>) =>
    ({
        _id: invitation._id,
        organizationId: invitation.organizationId,
        role: invitation.role ?? null,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
        inviterId: invitation.inviterId,
    }) satisfies AuditRecord;

const sanitizeMember = (member: Doc<'member'>) =>
    ({
        _id: member._id,
        organizationId: member.organizationId,
        userId: member.userId,
        role: member.role,
        createdAt: member.createdAt,
    }) satisfies AuditRecord;

const insertAuthAuditLog = async (
    ctx: MutationCtx,
    args: Omit<AuditEntry, 'userId' | 'organizationId' | 'resourceId'> & {
        userId: string;
        organizationId?: string | null;
        resourceId?: string;
    }
) => {
    const userId = ctx.db.normalizeId('user', args.userId);

    if (!userId) {
        return;
    }

    // Sessions and accounts are platform-wide: only organization events carry one.
    const organizationId = args.organizationId
        ? (ctx.db.normalizeId('organization', args.organizationId) ?? undefined)
        : undefined;

    await insertAuditLog(ctx, { ...args, userId, organizationId });
};

export const authAuditTriggers: BetterAuthTriggers<DataModel, BetterAuthSchema, GenericCtx> = {
    session: {
        change: async (change, ctx) => {
            const mutationCtx = requireMutationCtx(ctx);

            if (change.operation === 'insert') {
                await insertAuthAuditLog(mutationCtx, {
                    action: 'session.created',
                    severity: 'info',
                    resourceType: 'session',
                    resourceId: change.newDoc._id,
                    userId: change.newDoc.userId,
                    organizationId: change.newDoc.activeOrganizationId ?? null,
                    metadata: { after: sanitizeSession(change.newDoc) },
                });
            }

            if (change.operation === 'delete') {
                await insertAuthAuditLog(mutationCtx, {
                    action: 'session.deleted',
                    severity: 'info',
                    resourceType: 'session',
                    resourceId: change.oldDoc._id,
                    userId: change.oldDoc.userId,
                    organizationId: change.oldDoc.activeOrganizationId ?? null,
                    metadata: { before: sanitizeSession(change.oldDoc) },
                });
            }
        },
    },
    invitation: {
        change: async (change, ctx) => {
            const mutationCtx = requireMutationCtx(ctx);

            if (change.operation === 'insert') {
                await insertAuthAuditLog(mutationCtx, {
                    action: 'invitation.created',
                    severity: 'info',
                    resourceType: 'invitation',
                    resourceId: change.newDoc._id,
                    userId: change.newDoc.inviterId,
                    organizationId: change.newDoc.organizationId,
                    metadata: { after: sanitizeInvitation(change.newDoc) },
                });
            }

            if (change.operation === 'update') {
                await insertAuthAuditLog(mutationCtx, {
                    action: 'invitation.updated',
                    severity: 'info',
                    resourceType: 'invitation',
                    resourceId: change.newDoc._id,
                    userId: change.newDoc.inviterId,
                    organizationId: change.newDoc.organizationId,
                    metadata: {
                        before: sanitizeInvitation(change.oldDoc),
                        after: sanitizeInvitation(change.newDoc),
                    },
                });
            }

            if (change.operation === 'delete') {
                await insertAuthAuditLog(mutationCtx, {
                    action: 'invitation.deleted',
                    severity: 'warning',
                    resourceType: 'invitation',
                    resourceId: change.oldDoc._id,
                    userId: change.oldDoc.inviterId,
                    organizationId: change.oldDoc.organizationId,
                    metadata: { before: sanitizeInvitation(change.oldDoc) },
                });
            }
        },
    },
    user: {
        change: async (change, ctx) => {
            const mutationCtx = requireMutationCtx(ctx);

            if (change.operation === 'update') {
                await insertAuthAuditLog(mutationCtx, {
                    action: 'user.updated',
                    severity: 'warning',
                    resourceType: 'user',
                    resourceId: change.newDoc._id,
                    userId: change.newDoc._id,
                    metadata: {
                        before: sanitizeUser(change.oldDoc),
                        after: sanitizeUser(change.newDoc),
                    },
                });
            }

            if (change.operation === 'delete') {
                await insertAuthAuditLog(mutationCtx, {
                    action: 'user.deleted',
                    severity: 'critical',
                    resourceType: 'user',
                    resourceId: change.oldDoc._id,
                    userId: change.oldDoc._id,
                    metadata: { before: sanitizeUser(change.oldDoc) },
                });
            }
        },
    },
    member: {
        change: async (change, ctx) => {
            const mutationCtx = requireMutationCtx(ctx);

            if (change.operation === 'delete') {
                await mutationCtx.scheduler.runAfter(
                    0,
                    internal.objectiveAccess.removeMemberAccess,
                    {
                        userId: change.oldDoc.userId,
                        organizationId: change.oldDoc.organizationId,
                    }
                );
                await insertAuthAuditLog(mutationCtx, {
                    action: 'organization_member.deleted',
                    severity: 'warning',
                    resourceType: 'organization_member',
                    resourceId: change.oldDoc._id,
                    userId: change.oldDoc.userId,
                    organizationId: change.oldDoc.organizationId,
                    metadata: { before: sanitizeMember(change.oldDoc) },
                });
            }
        },
    },
};
