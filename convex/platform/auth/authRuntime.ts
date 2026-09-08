import { ConvexError } from 'convex/values';
import type { ActionCtx, MutationCtx, QueryCtx } from '../../_generated/server';
import type { Id } from '../../_generated/dataModel';
import { ERROR_CODES } from '../../utils/constants';
import { getOptionalString, isJsonObject, type JsonObject } from '../../../shared/boundary-values';
import { isPersonalOrganizationMetadata } from '../../domain/organizations/personalOrganization';
import { DEFAULT_ORGANIZATION_SLUG_BASE } from '../../domain/organizations/personalOrganization';
export type GenericCtx = QueryCtx | MutationCtx | ActionCtx;
export type RunnableCtx = MutationCtx | ActionCtx;
export function isRunnableCtx(ctx: GenericCtx): ctx is RunnableCtx {
    return 'runMutation' in ctx;
}
export function isMutationCtx(ctx: GenericCtx): ctx is MutationCtx {
    return 'runMutation' in ctx && 'db' in ctx && 'scheduler' in ctx;
}
export function requireRunnableCtx(ctx: GenericCtx): RunnableCtx {
    if (!isRunnableCtx(ctx)) {
        throw new ConvexError(ERROR_CODES.INTERNAL_ERROR);
    }
    return ctx;
}
export function requireMutationCtx(ctx: GenericCtx): MutationCtx {
    if (!isMutationCtx(ctx)) {
        throw new ConvexError(ERROR_CODES.INTERNAL_ERROR);
    }
    return ctx;
}
export function requireUserId(ctx: MutationCtx, value: string): Id<'user'> {
    const userId = ctx.db.normalizeId('user', value);
    if (!userId) {
        throw new ConvexError(ERROR_CODES.INTERNAL_ERROR);
    }
    return userId;
}
export function requireOrganizationId(ctx: MutationCtx, value: string): Id<'organization'> {
    const organizationId = ctx.db.normalizeId('organization', value);
    if (!organizationId) {
        throw new ConvexError(ERROR_CODES.INTERNAL_ERROR);
    }
    return organizationId;
}
export function readAuthBody(
    body: JsonObject | object | string | null | undefined
): JsonObject | undefined {
    return isJsonObject(body) ? body : undefined;
}
export function readAuthStringField(body: JsonObject | undefined, key: string): string | undefined {
    if (!body) {
        return undefined;
    }
    return getOptionalString(body[key]);
}
export function usesReservedPersonalOrganizationIdentity(organization: {
    slug?: string | null;
    metadata?: string | JsonObject | null;
}) {
    const reservedSlug =
        typeof organization.slug === 'string' &&
        organization.slug.startsWith(`${DEFAULT_ORGANIZATION_SLUG_BASE}-`);
    if (reservedSlug) {
        return true;
    }
    if (typeof organization.metadata === 'string') {
        return isPersonalOrganizationMetadata(organization.metadata);
    }
    if (isJsonObject(organization.metadata)) {
        return organization.metadata.type === 'personal';
    }
    return false;
}
