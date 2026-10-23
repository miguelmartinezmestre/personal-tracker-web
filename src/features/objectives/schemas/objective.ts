import { z } from 'zod';
import { isTargetReached } from '@/convex/features/objectives/rules';
import type { Id } from '@/convex/_generated/dataModel';
import { dateInputToUtcTimestamp, todayDateInput } from '@/features/objectives/lib/dates';

export const NONE_CATEGORY = 'none';

type ObjectiveValidationKey =
    | 'titleRequired'
    | 'numberRequired'
    | 'targetDirection'
    | 'dateInvalid'
    | 'deadlinePast'
    | 'dueSoonDaysInvalid';

type ProgressValidationKey =
    'amountRequired' | 'amountZero' | 'valueUnchanged' | 'dateInvalid' | 'dateFuture';

// Dates are typed as text and kept as `YYYY-MM-DD` once read, so anything else is unreadable.
function dateTextSchema(message: string) {
    return z.string().refine(value => dateInputToUtcTimestamp(value) !== undefined, {
        error: message,
    });
}

export const accessSchema = z.object({
    memberAccess: z.enum(['none', 'view', 'edit']),
    users: z.array(
        z.object({
            userId: z.custom<Id<'user'>>(value => typeof value === 'string'),
            name: z.string(),
            access: z.enum(['view', 'edit']),
        })
    ),
});

export type AccessFormValues = z.infer<typeof accessSchema>;

/**
 * A new deadline cannot be in the past. `keptDeadline` is the one the objective already has, so
 * an overdue objective can still be edited without moving its deadline.
 */
export function objectiveFormSchema(
    message: (key: ObjectiveValidationKey) => string,
    keptDeadline = ''
) {
    return z
        .object({
            title: z
                .string()
                .trim()
                .min(1, { error: message('titleRequired') }),
            description: z.string(),
            categoryId: z.string(),
            unit: z.string(),
            direction: z.enum(['increase', 'decrease']),
            startValue: z.number({ error: message('numberRequired') }),
            targetValue: z.number({ error: message('numberRequired') }),
            deadline: z.union([
                z.literal(''),
                dateTextSchema(message('dateInvalid')).refine(
                    // Date inputs use ISO strings, so lexical order matches calendar order.
                    value => value === keptDeadline || value >= todayDateInput(),
                    { error: message('deadlinePast') }
                ),
            ]),
            dueSoonDays: z
                .number({ error: message('dueSoonDaysInvalid') })
                .int({ error: message('dueSoonDaysInvalid') })
                .min(1, { error: message('dueSoonDaysInvalid') }),
            // Only set when creating; later changes go through the permissions dialog.
            memberAccess: accessSchema.shape.memberAccess,
            users: accessSchema.shape.users,
        })
        .refine(
            value =>
                !Number.isFinite(value.startValue) ||
                !Number.isFinite(value.targetValue) ||
                !isTargetReached(value.direction, value.startValue, value.targetValue),
            { path: ['targetValue'], error: message('targetDirection') }
        );
}

export type ObjectiveFormValues = z.infer<ReturnType<typeof objectiveFormSchema>>;

/**
 * `baseValue` is what a "new value" entry is compared with: the current total for a new entry,
 * or the total just before the entry being corrected.
 */
export function progressFormSchema(
    message: (key: ProgressValidationKey) => string,
    baseValue: number
) {
    return z
        .object({
            mode: z.enum(['difference', 'value']),
            amount: z.number({ error: message('amountRequired') }),
            updateDate: dateTextSchema(message('dateInvalid')).refine(
                value => value <= todayDateInput(),
                { error: message('dateFuture') }
            ),
            comment: z.string(),
        })
        .superRefine((value, context) => {
            if (value.mode === 'difference' && value.amount === 0) {
                context.addIssue({
                    code: 'custom',
                    path: ['amount'],
                    message: message('amountZero'),
                });
            }

            if (value.mode === 'value' && value.amount === baseValue) {
                context.addIssue({
                    code: 'custom',
                    path: ['amount'],
                    message: message('valueUnchanged'),
                });
            }
        });
}

export type ProgressFormValues = z.infer<ReturnType<typeof progressFormSchema>>;
