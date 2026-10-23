import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

crons.daily(
    'send deadline notifications',
    { hourUTC: 6, minuteUTC: 0 },
    internal.notifications.sendDeadlineNotifications,
    {}
);

export default crons;
