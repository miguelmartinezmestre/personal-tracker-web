import { z } from 'zod';

export const objectiveTypeSchema = z.enum(['value', 'count', 'money', 'duration']);
export const periodSchema = z.enum(['none']);
export const directionSchema = z.enum(['increase', 'decrease']);
// "biweekly" is presented to users as "twice per month".
export const reminderIntervalSchema = z.enum(['none', 'monthly', 'biweekly']);
export const progressModeSchema = z.enum(['cumulative', 'snapshot']);

/**
 * Objective status schema
 * - active: Objective is being worked on (default for new objectives)
 * - paused: Objective is temporarily paused
 * - completed: Objective has been completed (manually or auto)
 * - archived: Objective is archived (read-only terminal state)
 * - deleted: Objective is soft-deleted (terminal state)
 */
export const objectiveStatusSchema = z.enum([
    'active',
    'paused',
    'completed',
    'archived',
    'deleted',
]);

export type ObjectiveStatus = z.infer<typeof objectiveStatusSchema>;

export const objectiveSchema = z.object({
    title: z.string().min(1, { message: 'Title is required' }),
    description: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    targetValue: z.number(),
    currentValue: z.number(),
    startValue: z.number().optional().nullable(),
    deadline: z.number().optional().nullable(),
    status: objectiveStatusSchema.optional().nullable(),
    unit: z.string().optional().nullable(),
    objectiveType: objectiveTypeSchema.optional().nullable(),
    direction: directionSchema.optional().nullable(),
    period: periodSchema.optional().nullable(),
    periodStart: z.number().optional().nullable(),
    periodLengthDays: z.number().int().positive().optional().nullable(),
    reminderInterval: reminderIntervalSchema.optional().nullable(),
    progressMode: progressModeSchema.optional().nullable(),
});

export const savedObjectiveSchema = objectiveSchema.extend({
    _id: z.string(),
    workflowId: z.string().optional().nullable(),
});

export type Objective = z.infer<typeof savedObjectiveSchema>;
export type CreateObjective = z.infer<typeof objectiveSchema>;
