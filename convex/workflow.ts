/**
 * Workflow Manager Configuration
 *
 * This file exports the configured WorkflowManager for the application.
 *
 * Key configuration choices:
 * - retryActionsByDefault: true - enables retries for external API calls
 * - maxParallelism: 5 - conservative for smaller Convex plans
 *
 * IMPORTANT: Run `pnpm install` from the monorepo root to install @convex-dev/workflow
 */

import { WorkflowManager } from '@convex-dev/workflow';
import { components } from './_generated/api';

export const workflow = new WorkflowManager(components.workflow, {
  workpoolOptions: {
    // Enable retries by default for resilience
    retryActionsByDefault: true,
    defaultRetryBehavior: {
      maxAttempts: 3,
      initialBackoffMs: 200,
      base: 2, // exponential backoff
    },
    // Conservative parallelism - adjust based on your Convex plan
    maxParallelism: 5,
  },
});
