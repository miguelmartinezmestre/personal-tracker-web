import { customCtx, customMutation } from 'convex-helpers/server/customFunctions';
import { internalMutation as rawInternalMutation } from '../../_generated/server';
import { domainTriggers } from './domainTriggers';

export const internalMutation = customMutation(
    rawInternalMutation,
    customCtx(domainTriggers.wrapDB)
);
