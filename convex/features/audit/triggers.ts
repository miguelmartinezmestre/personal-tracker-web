import { internal } from '../../_generated/api';
import type { DataModel } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';
import type { Triggers } from '@convex-dev/better-auth';
import type { Infer } from 'convex/values';
import type authSchema from '../../betterAuth/schema';
import { insertAuditLog, type AuditEntry, type AuditRecord } from './log';

type AuthTables = (typeof authSchema)['tables'];

type Doc<Table extends keyof AuthTables> = Infer<AuthTables[Table]['validator']> & {
    _id: string;
    _creationTime: number;
};

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

const sanitizeAccount = (account: Doc<'account'>) =>
    ({
        _id: account._id,
        userId: account.userId,
        providerId: account.providerId,
        hasPassword: account.password !== null && account.password !== undefined,
    }) satisfies AuditRecord;

const insertAuthAuditLog = async (
    ctx: MutationCtx,
    args: Omit<AuditEntry, 'organizationId'> & { organizationId?: string | null }
) => {
    await insertAuditLog(ctx, { ...args, organizationId: args.organizationId ?? undefined });
};

export const authAuditTriggers: Triggers<DataModel, typeof authSchema> = {
    session: {
        onCreate: async (ctx, session) => {
            await insertAuthAuditLog(ctx, {
                action: 'session.created',
                severity: 'info',
                resourceType: 'session',
                resourceId: session._id,
                userId: session.userId,
                organizationId: session.activeOrganizationId ?? null,
                metadata: { after: sanitizeSession(session) },
            });
        },
        onDelete: async (ctx, session) => {
            await insertAuthAuditLog(ctx, {
                action: 'session.deleted',
                severity: 'info',
                resourceType: 'session',
                resourceId: session._id,
                userId: session.userId,
                organizationId: session.activeOrganizationId ?? null,
                metadata: { before: sanitizeSession(session) },
            });
        },
    },
    invitation: {
        onCreate: async (ctx, invitation) => {
            await insertAuthAuditLog(ctx, {
                action: 'invitation.created',
                severity: 'info',
                resourceType: 'invitation',
                resourceId: invitation._id,
                userId: invitation.inviterId,
                organizationId: invitation.organizationId,
                metadata: { after: sanitizeInvitation(invitation) },
            });
        },
        onUpdate: async (ctx, newDoc, oldDoc) => {
            await insertAuthAuditLog(ctx, {
                action: 'invitation.updated',
                severity: 'info',
                resourceType: 'invitation',
                resourceId: newDoc._id,
                userId: newDoc.inviterId,
                organizationId: newDoc.organizationId,
                metadata: { before: sanitizeInvitation(oldDoc), after: sanitizeInvitation(newDoc) },
            });
        },
        onDelete: async (ctx, invitation) => {
            await insertAuthAuditLog(ctx, {
                action: 'invitation.deleted',
                severity: 'warning',
                resourceType: 'invitation',
                resourceId: invitation._id,
                userId: invitation.inviterId,
                organizationId: invitation.organizationId,
                metadata: { before: sanitizeInvitation(invitation) },
            });
        },
    },
    user: {
        onCreate: async (ctx, user) => {
            await insertAuthAuditLog(ctx, {
                action: 'user.created',
                severity: 'info',
                resourceType: 'user',
                resourceId: user._id,
                userId: user._id,
                metadata: { after: sanitizeUser(user) },
            });
        },
        onUpdate: async (ctx, newDoc, oldDoc) => {
            await insertAuthAuditLog(ctx, {
                action: 'user.updated',
                severity: 'warning',
                resourceType: 'user',
                resourceId: newDoc._id,
                userId: newDoc._id,
                metadata: { before: sanitizeUser(oldDoc), after: sanitizeUser(newDoc) },
            });
        },
        onDelete: async (ctx, user) => {
            await insertAuthAuditLog(ctx, {
                action: 'user.deleted',
                severity: 'critical',
                resourceType: 'user',
                resourceId: user._id,
                userId: user._id,
                metadata: { before: sanitizeUser(user) },
            });
        },
    },
    account: {
        onCreate: async (ctx, account) => {
            if (account.providerId !== 'credential') {
                return;
            }

            await insertAuthAuditLog(ctx, {
                action: 'user.password_created',
                severity: 'info',
                resourceType: 'user',
                resourceId: account.userId,
                userId: account.userId,
                metadata: { after: sanitizeAccount(account) },
            });
        },
        onUpdate: async (ctx, newDoc, oldDoc) => {
            if (newDoc.providerId !== 'credential' || oldDoc.password === newDoc.password) {
                return;
            }

            await insertAuthAuditLog(ctx, {
                action: 'user.password_changed',
                severity: 'warning',
                resourceType: 'user',
                resourceId: newDoc.userId,
                userId: newDoc.userId,
                metadata: { before: sanitizeAccount(oldDoc), after: sanitizeAccount(newDoc) },
            });
        },
        onDelete: async (ctx, account) => {
            if (account.providerId !== 'credential') {
                return;
            }

            await insertAuthAuditLog(ctx, {
                action: 'user.password_removed',
                severity: 'warning',
                resourceType: 'user',
                resourceId: account.userId,
                userId: account.userId,
                metadata: { before: sanitizeAccount(account) },
            });
        },
    },
    member: {
        onCreate: async (ctx, member) => {
            await insertAuthAuditLog(ctx, {
                action: 'organization_member.created',
                severity: 'info',
                resourceType: 'organization_member',
                resourceId: member._id,
                userId: member.userId,
                organizationId: member.organizationId,
                metadata: { after: sanitizeMember(member) },
            });
        },
        onUpdate: async (ctx, newDoc, oldDoc) => {
            await insertAuthAuditLog(ctx, {
                action: 'organization_member.updated',
                severity: 'warning',
                resourceType: 'organization_member',
                resourceId: newDoc._id,
                userId: newDoc.userId,
                organizationId: newDoc.organizationId,
                metadata: { before: sanitizeMember(oldDoc), after: sanitizeMember(newDoc) },
            });
        },
        onDelete: async (ctx, member) => {
            await ctx.scheduler.runAfter(0, internal.objectiveAccess.removeMemberAccess, {
                userId: member.userId,
                organizationId: member.organizationId,
            });
            await insertAuthAuditLog(ctx, {
                action: 'organization_member.deleted',
                severity: 'warning',
                resourceType: 'organization_member',
                resourceId: member._id,
                userId: member.userId,
                organizationId: member.organizationId,
                metadata: { before: sanitizeMember(member) },
            });
        },
    },
};
