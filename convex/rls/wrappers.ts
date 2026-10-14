import { customCtx, customMutation, customQuery } from 'convex-helpers/server/customFunctions';
import {
    type RLSConfig,
    wrapDatabaseReader,
    wrapDatabaseWriter,
} from 'convex-helpers/server/rowLevelSecurity';
import {
    mutation,
    query,
    type DatabaseReader,
    type DatabaseWriter,
    type MutationCtx,
    type QueryCtx,
} from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { resolveAuthContext } from './authContext';
import { createRlsRules } from './policies';

const config: RLSConfig = { defaultPolicy: 'deny' };

type QueryRlsCtx = {
    db: DatabaseReader;
    dbForIntegrityChecks: DatabaseReader;
    userId: Id<'user'>;
    email: string | null;
    organizationId: Id<'organization'> | null;
    role: string;
    memberRole: string | null;
};

type MutationRlsCtx = {
    db: DatabaseWriter;
    dbForIntegrityChecks: DatabaseReader;
    userId: Id<'user'>;
    email: string | null;
    organizationId: Id<'organization'> | null;
    role: string;
    memberRole: string | null;
};

async function buildQueryRlsCtx(ctx: QueryCtx): Promise<QueryRlsCtx> {
    const { userId, email, organizationId, role, memberRole } = await resolveAuthContext(ctx);

    return {
        dbForIntegrityChecks: ctx.db,
        db: wrapDatabaseReader(
            ctx,
            ctx.db,
            createRlsRules({ userId, role, memberRole, ctx, organizationId, email }),
            config
        ),
        userId,
        email,
        organizationId,
        role,
        memberRole,
    };
}

async function buildMutationRlsCtx(ctx: MutationCtx): Promise<MutationRlsCtx> {
    const { userId, email, organizationId, role, memberRole } = await resolveAuthContext(ctx);
    const rlsDb = wrapDatabaseWriter(
        ctx,
        ctx.db,
        createRlsRules({ userId, role, memberRole, ctx, organizationId, email }),
        config
    );

    return {
        db: rlsDb,
        dbForIntegrityChecks: ctx.db,
        userId,
        email,
        organizationId,
        role,
        memberRole,
    };
}

export const queryWithRLS = customQuery(
    query,
    customCtx(async (ctx): Promise<QueryRlsCtx> => {
        return await buildQueryRlsCtx(ctx);
    })
);

export const mutationWithRLS = customMutation(
    mutation,
    customCtx(async (ctx): Promise<MutationRlsCtx> => {
        return await buildMutationRlsCtx(ctx);
    })
);
