import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

crons.daily(
    'purge audit logs past retention',
    { hourUTC: 4, minuteUTC: 15 },
    internal.auditLogs.pruneAuditLogsOlderThanRetention
);

export default crons;
