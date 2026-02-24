/**
 * Objective Lifecycle Events
 *
 * Status transition rules and helpers for the objective lifecycle.
 */

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
const STATUS_TRANSITIONS: Record<string, string[]> = {
    active: ['paused', 'completed', 'archived', 'deleted'],
    paused: ['active', 'completed', 'archived', 'deleted'],
    completed: ['active', 'archived', 'deleted'], // active: reopened when progress regresses
    archived: ['deleted'],
    deleted: [], // No transitions from deleted
};

/**
 * Check if a status transition is valid
 */
export function isValidTransition(from: string, to: string): boolean {
    return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
