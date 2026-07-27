import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

crons.cron(
    'purge audit logs past retention',
    '15 4 * * *',
    internal.auditLogs.pruneAuditLogsOlderThanRetention,
    {}
);

crons.cron(
    'create deadline notifications',
    '0 8 * * *',
    internal.notifications.runDeadlineNotificationsCron,
    {}
);

crons.interval(
    'backfill objective early bird facts',
    { minutes: 10 },
    internal.achievements.backfillObjectiveEarlyBirdFacts,
    {}
);

export default crons;
