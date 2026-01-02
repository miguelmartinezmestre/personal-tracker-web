import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Runs daily at 09:00 UTC to send deadline reminders/overdue alerts.
crons.cron('deadline-notifications-daily', '0 9 * * *', internal.notifications.runDeadlineNotificationsCron);

export default crons;
