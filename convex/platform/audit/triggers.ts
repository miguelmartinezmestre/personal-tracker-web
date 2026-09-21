import type { MutationCtx } from '../../_generated/server';
import type { Id } from '../../_generated/dataModel';

export type AuditTriggerCtx = MutationCtx & {
    userId?: Id<'user'>;
    organizationId?: Id<'organization'> | null;
    role?: string;
};
