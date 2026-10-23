import type { Rules } from 'convex-helpers/server/rowLevelSecurity';
import type { DataModel } from '../../_generated/dataModel';
import type { QueryCtx } from '../../_generated/server';
import { objectiveTableRules } from './objectiveTableRules';
import { organizationTableRules } from './organizationTableRules';
import { createRlsHelpers, type CreateRlsRulesArgs } from './rlsHelpers';

export type { CreateRlsRulesArgs };

export function createRlsRules(args: CreateRlsRulesArgs) {
    const helpers = createRlsHelpers(args);

    return {
        ...organizationTableRules(helpers),
        ...objectiveTableRules(helpers),
    } satisfies Rules<QueryCtx, DataModel>;
}
