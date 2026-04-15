import { WorkflowManager } from '@convex-dev/workflow';
import { components } from './_generated/api';

export const workflow = new WorkflowManager(components.workflow, {
    workpoolOptions: {
        retryActionsByDefault: true,
        defaultRetryBehavior: {
            maxAttempts: 3,
            initialBackoffMs: 200,
            base: 2,
        },
        maxParallelism: 5,
    },
});
