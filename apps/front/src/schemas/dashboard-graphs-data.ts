import { z } from 'zod';

export const dashboardGraphsDataSchema = z.object({
    totalObjectives: z.number(),
    pendingObjectives: z.number(),
    completedObjectives: z.number(),
    progressAddedPerMonth: z.array(
        z.object({
            month: z.string(),
            count: z.number(),
        })
    ),
    mostRecentObjectivesDeadlines: z.array(
        z.object({
            objective: z.string(),
            days: z.number(),
            fill: z.string(),
        })
    ),
    objectivesWithMostProgress: z.array(
        z.object({
            objective: z.string(),
            progress: z.number(),
        })
    ),
});
