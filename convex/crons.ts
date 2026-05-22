import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

crons.cron(
    'purge audit logs past retention',
    '15 4 * * *',
    internal.auditLogs.pruneAuditLogsOlderThanRetention,
    {}
);

export default crons;
