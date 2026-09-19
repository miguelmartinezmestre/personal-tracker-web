import aggregate from '@convex-dev/aggregate/convex.config.js';
import { defineApp } from 'convex/server';
import resend from '@convex-dev/resend/convex.config.js';

const app = defineApp();
app.use(resend);
app.use(aggregate, { name: 'dashboardObjectives' });
app.use(aggregate, { name: 'dashboardProgress' });

export default app;
