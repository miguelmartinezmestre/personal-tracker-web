import type { Rules } from 'convex-helpers/server/rowLevelSecurity';
import type { DataModel } from '../../_generated/dataModel';
import type { QueryCtx } from '../../_generated/server';
import { notificationTableRules } from './notificationTableRules';
import { objectiveTableRules } from './objectiveTableRules';
import { organizationTableRules } from './organizationTableRules';
import { createRlsHelpers, rlsWhen, rlsDeny, type CreateRlsRulesArgs } from './rlsHelpers';

export type { CreateRlsRulesArgs };

export function createRlsRules(args: CreateRlsRulesArgs) {
    const helpers = createRlsHelpers(args);

    return {
        dashboardMigrations: {
            read: (_ctx, row) => rlsWhen(helpers.isActiveOrganization(row.organizationId)),
            insert: rlsDeny,
            modify: rlsDeny,
        },
        dashboardResyncs: {
            read: (_ctx, row) => rlsWhen(helpers.isActiveOrganization(row.organizationId)),
            insert: rlsDeny,
            modify: rlsDeny,
        },
        ...objectiveTableRules(helpers),
        ...notificationTableRules(helpers),
        ...organizationTableRules(helpers),
    } satisfies Rules<QueryCtx, DataModel>;
}
