import { Triggers } from 'convex-helpers/server/triggers';
import type { DataModel } from '../../_generated/dataModel';
import type { AuditTriggerCtx } from '../audit/triggers';

export const domainTriggers = new Triggers<DataModel, AuditTriggerCtx>();
