import aggregate from '@convex-dev/aggregate/convex.config.js';
import { defineApp } from 'convex/server';
import workflow from '@convex-dev/workflow/convex.config.js';
import resend from '@convex-dev/resend/convex.config.js';

const app = defineApp();
app.use(workflow);
app.use(resend);
app.use(aggregate, { name: 'dashboardObjectives' });
app.use(aggregate, { name: 'dashboardProgress' });

export default app;
