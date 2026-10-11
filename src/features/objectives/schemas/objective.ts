import { z } from 'zod';
import {
    OBJECTIVE_DESCRIPTION_MAX_LENGTH,
    OBJECTIVE_TITLE_MAX_LENGTH,
    OBJECTIVE_UNIT_MAX_LENGTH,
    PROGRESS_COMMENT_MAX_LENGTH,
} from '@/convex/constants';
import { dateInputToUtcTimestamp, todayDateInput } from '@/features/objectives/lib/dates';

export const NONE_CATEGORY = 'none';
// Same minimum the backend enforces in createObjective/updateObjective.
const OBJECTIVE_TARGET_MIN = 0.001;

type ObjectiveValidationKey =
    | 'titleRequired'
    | 'titleTooLong'
    | 'descriptionTooLong'
    | 'unitTooLong'
    | 'numberRequired'
    | 'startNegative'
    | 'targetTooSmall'
    | 'startBelowTarget'
    | 'dateInvalid'
    | 'deadlinePast';

type ProgressValidationKey =
    'amountRequired' | 'amountPositive' | 'dateInvalid' | 'dateFuture' | 'commentTooLong';

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
            startValue: z
                .number({ error: message('numberRequired') })
                .min(0, { error: message('startNegative') }),
            targetValue: z
                .number({ error: message('numberRequired') })
                .min(OBJECTIVE_TARGET_MIN, { error: message('targetTooSmall') }),
            deadline: z
                .string()
                .refine(value => value === '' || dateInputToUtcTimestamp(value) !== undefined, {
                    error: message('dateInvalid'),
                })
                .refine(
                    value => value === '' || value === keptDeadline || value >= todayDateInput(),
                    { error: message('deadlinePast') }
                ),
        })
        .refine(
            // Compared only once the target is valid, so one bad number shows one error.
            value =>
                !(value.targetValue >= OBJECTIVE_TARGET_MIN) ||
                value.startValue < value.targetValue,
            { path: ['startValue'], error: message('startBelowTarget') }
        );
}

export type ObjectiveFormValues = z.infer<ReturnType<typeof objectiveFormSchema>>;

export function progressFormSchema(message: (key: ProgressValidationKey) => string) {
    return z.object({
        updatedValue: z
            .number({ error: message('amountRequired') })
            .positive({ error: message('amountPositive') }),
        updateDate: z
            .string()
            .refine(value => dateInputToUtcTimestamp(value) !== undefined, {
                error: message('dateInvalid'),
            })
            // Date inputs use ISO strings, so lexical order matches calendar order.
            .refine(value => value <= todayDateInput(), { error: message('dateFuture') }),
        comment: z.string().max(PROGRESS_COMMENT_MAX_LENGTH, { error: message('commentTooLong') }),
    });
}

export type ProgressFormValues = z.infer<ReturnType<typeof progressFormSchema>>;
