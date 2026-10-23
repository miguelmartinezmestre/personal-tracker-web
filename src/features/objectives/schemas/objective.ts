import { z } from 'zod';
import {
    MAX_DUE_SOON_DAYS,
    MAX_METRIC,
    OBJECTIVE_DESCRIPTION_MAX_LENGTH,
    OBJECTIVE_TITLE_MAX_LENGTH,
    OBJECTIVE_UNIT_MAX_LENGTH,
    PROGRESS_COMMENT_MAX_LENGTH,
    PROGRESS_HISTORY_DAYS,
} from '@/convex/features/objectives/constants';
import { isTargetReached } from '@/convex/features/objectives/rules';
import type { Id } from '@/convex/_generated/dataModel';
import { dateInputToUtcTimestamp, todayDateInput } from '@/features/objectives/lib/dates';

export const NONE_CATEGORY = 'none';

const DAY_MS = 24 * 60 * 60 * 1000;

type ObjectiveValidationKey =
    | 'titleRequired'
    | 'titleTooLong'
    | 'descriptionTooLong'
    | 'unitTooLong'
    | 'numberRequired'
    | 'valueTooLarge'
    | 'targetDirection'
    | 'dateInvalid'
    | 'deadlinePast'
    | 'dueSoonDaysRange';

type ProgressValidationKey =
    | 'amountRequired'
    | 'valueTooLarge'
    | 'amountZero'
    | 'valueUnchanged'
    | 'dateInvalid'
    | 'dateFuture'
    | 'dateTooOld'
    | 'commentTooLong';

function metricSchema(message: (key: 'numberRequired' | 'valueTooLarge') => string) {
    return z
        .number({ error: message('numberRequired') })
        .min(-MAX_METRIC, { error: message('valueTooLarge') })
        .max(MAX_METRIC, { error: message('valueTooLarge') });
}

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
                .min(1, { error: message('titleRequired') })
                .max(OBJECTIVE_TITLE_MAX_LENGTH, { error: message('titleTooLong') }),
            description: z
                .string()
                .max(OBJECTIVE_DESCRIPTION_MAX_LENGTH, { error: message('descriptionTooLong') }),
            categoryId: z.string(),
            unit: z.string().max(OBJECTIVE_UNIT_MAX_LENGTH, { error: message('unitTooLong') }),
            direction: z.enum(['increase', 'decrease']),
            startValue: metricSchema(message),
            targetValue: metricSchema(message),
            deadline: z.union([
                z.literal(''),
                dateTextSchema(message('dateInvalid')).refine(
                    // Date inputs use ISO strings, so lexical order matches calendar order.
                    value => value === keptDeadline || value >= todayDateInput(),
                    { error: message('deadlinePast') }
                ),
            ]),
            dueSoonDays: z
                .number({ error: message('dueSoonDaysRange') })
                .int({ error: message('dueSoonDaysRange') })
                .min(1, { error: message('dueSoonDaysRange') })
                .max(MAX_DUE_SOON_DAYS, { error: message('dueSoonDaysRange') }),
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
            amount: metricSchema(key => message(key === 'numberRequired' ? 'amountRequired' : key)),
            updateDate: dateTextSchema(message('dateInvalid'))
                .refine(value => value <= todayDateInput(), { error: message('dateFuture') })
                .refine(
                    value =>
                        (dateInputToUtcTimestamp(value) ?? 0) >=
                        (dateInputToUtcTimestamp(todayDateInput()) ?? 0) -
                            PROGRESS_HISTORY_DAYS * DAY_MS,
                    { error: message('dateTooOld') }
                ),
            comment: z
                .string()
                .max(PROGRESS_COMMENT_MAX_LENGTH, { error: message('commentTooLong') }),
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
