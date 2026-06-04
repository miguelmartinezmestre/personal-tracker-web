import { customCtx, customMutation, customQuery } from 'convex-helpers/server/customFunctions';
import {
    type RLSConfig,
    wrapDatabaseReader,
    wrapDatabaseWriter,
} from 'convex-helpers/server/rowLevelSecurity';
import { mutation, query, type DatabaseReader, type DatabaseWriter } from '../../_generated/server';
import type { Id } from '../../_generated/dataModel';
import { auditLogTriggers } from '../audit/triggers';
import { resolveAuthContext } from './authContext';
import { createRlsRules } from './policies';

const config: RLSConfig = { defaultPolicy: 'deny' };

type QueryRlsCtx = {
    db: DatabaseReader;
    userId: Id<'user'>;
    email: string;
    organizationId: Id<'organization'> | null;
    role: string;
    memberRole: string | null;
};

type MutationRlsCtx = {
    db: DatabaseWriter;
    userId: Id<'user'>;
    email: string;
    organizationId: Id<'organization'> | null;
    role: string;
    memberRole: string | null;
};

export const queryWithRLS = customQuery(
    query,
    customCtx(async (ctx): Promise<QueryRlsCtx> => {
        const { userId, email, organizationId, role, memberRole } = await resolveAuthContext(ctx);

        return {
            db: wrapDatabaseReader(
                ctx,
                ctx.db,
                await createRlsRules(userId, role, memberRole, ctx, organizationId, email),
                config
            ),
            userId,
            email,
            organizationId,
            role,
            memberRole,
        };
    })
);

export const mutationWithRLS = customMutation(
    mutation,
    customCtx(async (ctx): Promise<MutationRlsCtx> => {
        const { userId, email, organizationId, role, memberRole } = await resolveAuthContext(ctx);
        const triggerDb = auditLogTriggers.wrapDB({
            db: ctx.db,
            userId,
            organizationId,
            role,
        }).db;

        const rlsDb = wrapDatabaseWriter(
            ctx,
            triggerDb,
            await createRlsRules(userId, role, memberRole, ctx, organizationId, email),
            config
        );

        return {
            db: rlsDb,
            userId,
            email,
            organizationId,
            role,
            memberRole,
        };
    })
);
