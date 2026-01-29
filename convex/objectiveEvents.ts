/**
 * Objective Lifecycle Events
 *
 * These events are used to signal state transitions in the objective lifecycle workflow.
 * The workflow listens for these events and processes them accordingly.
 */

import { defineEvent } from '@convex-dev/workflow';
import { v, Infer } from 'convex/values';

/**
 * Tick event - periodic check for progress/deadline
 * Uses seq (sequence number) for anti-race pattern
 */
export const tickEvent = defineEvent({
    name: 'tick',
    validator: v.object({
        seq: v.number(),
    }),
});
export type TickEvent = Infer<typeof tickEvent.validator>;

/**
 * Pause event - user wants to pause the objective
 */
export const pauseEvent = defineEvent({
    name: 'pause',
    validator: v.object({
        reason: v.optional(v.string()),
    }),
});
export type PauseEvent = Infer<typeof pauseEvent.validator>;

/**
 * Resume event - user wants to resume a paused objective
 */
export const resumeEvent = defineEvent({
    name: 'resume',
    validator: v.object({}),
});
export type ResumeEvent = Infer<typeof resumeEvent.validator>;

/**
 * Complete event - objective has been completed (manually or auto)
 */
export const completeEvent = defineEvent({
    name: 'complete',
    validator: v.object({
        completedAt: v.number(),
        autoCompleted: v.optional(v.boolean()),
    }),
});
export type CompleteEvent = Infer<typeof completeEvent.validator>;

/**
 * Archive event - terminal state, read-only
 */
export const archiveEvent = defineEvent({
    name: 'archive',
    validator: v.object({
        reason: v.optional(v.string()),
    }),
});
export type ArchiveEvent = Infer<typeof archiveEvent.validator>;

/**
 * Delete event - terminal state, soft delete
 */
export const deleteEvent = defineEvent({
    name: 'delete',
    validator: v.object({}),
});
export type DeleteEvent = Infer<typeof deleteEvent.validator>;

/**
 * Reconfigure event - change deadline, period, or other settings
 */
export const reconfigureEvent = defineEvent({
    name: 'reconfigure',
    validator: v.object({
        newDeadline: v.optional(v.number()),
        newPeriod: v.optional(v.string()),
        newTargetValue: v.optional(v.number()),
    }),
});
export type ReconfigureEvent = Infer<typeof reconfigureEvent.validator>;

/**
 * Event names for convenience
 */
export type ObjectiveEventName =
    | 'tick'
    | 'pause'
    | 'resume'
    | 'complete'
    | 'archive'
    | 'delete'
    | 'reconfigure';

/**
 * Terminal statuses - workflow should end when reaching these
 */
export const TERMINAL_STATUSES = ['completed', 'archived', 'deleted'] as const;
export type TerminalStatus = (typeof TERMINAL_STATUSES)[number];

/**
 * Check if a status is terminal (workflow should end)
 */
export function isTerminalStatus(status: string): status is TerminalStatus {
    return TERMINAL_STATUSES.includes(status as TerminalStatus);
}

/**
 * Valid status transitions
 */
export const STATUS_TRANSITIONS: Record<string, string[]> = {
    active: ['paused', 'completed', 'archived', 'deleted'],
    paused: ['active', 'completed', 'archived', 'deleted'],
    completed: ['archived', 'deleted'],
    archived: ['deleted'],
    deleted: [], // No transitions from deleted
};

/**
 * Check if a status transition is valid
 */
export function isValidTransition(from: string, to: string): boolean {
    return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
