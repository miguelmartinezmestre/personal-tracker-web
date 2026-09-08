import { z } from 'zod';
import { OBJECTIVE_STATUS, OBJECTIVE_VISIBILITY } from '@/convex/utils/constants';
import { isCategorySelectPlaceholder } from '@/features/objectives/lib/objective-category-selection';
import {
    OBJECTIVE_DESCRIPTION_MAX_LENGTH,
    OBJECTIVE_TITLE_MAX_LENGTH,
    OBJECTIVE_UNIT_MAX_LENGTH,
} from '@shared/input-constraints';

export const objectiveStatusSchema = z.enum([OBJECTIVE_STATUS.ACTIVE, OBJECTIVE_STATUS.COMPLETED]);

const MAX_METRIC = 1_000_000_000;
const MIN_TARGET = 0.001;
const DAY_MS = 24 * 60 * 60 * 1000;
const FIVE_YEARS_MS = 5 * 365 * DAY_MS;

const metricSchema = z.number().min(0).max(MAX_METRIC);
const targetMetricSchema = z.number().min(MIN_TARGET).max(MAX_METRIC);
const deadlineSchema = z.number();

const categorySelectionSchema = z
    .string()
    .optional()
    .nullable()
    .refine(value => !isCategorySelectPlaceholder(value), {
        message: 'Select a valid category',
    });

export const objectiveSchema = z
    .object({
        title: z.string().trim().min(1).max(OBJECTIVE_TITLE_MAX_LENGTH),
        description: z.string().max(OBJECTIVE_DESCRIPTION_MAX_LENGTH).optional().nullable(),

        categoryId: categorySelectionSchema,
        targetValue: targetMetricSchema,
        currentValue: metricSchema,
        startValue: metricSchema.optional().nullable(),
        deadline: deadlineSchema.optional().nullable(),
        status: objectiveStatusSchema.optional().nullable(),
        unit: z.string().max(OBJECTIVE_UNIT_MAX_LENGTH).optional().nullable(),
        visibility: z
            .enum([OBJECTIVE_VISIBILITY.PRIVATE, OBJECTIVE_VISIBILITY.ORGANIZATION])
            .optional(),
    })
    .superRefine((values, context) => {
        if (values.startValue != null && values.startValue > values.targetValue) {
            context.addIssue({
                code: 'custom',
                path: ['startValue'],
                message: 'Starting value cannot exceed the target value',
            });
        }

        if (values.deadline == null) {
            return;
        }

        const now = Date.now();
        if (values.deadline < now - FIVE_YEARS_MS) {
            context.addIssue({
                code: 'custom',
                path: ['deadline'],
                message: 'Deadline is too far in the past',
            });
        }
        if (values.deadline > now + FIVE_YEARS_MS * 2) {
            context.addIssue({
                code: 'custom',
                path: ['deadline'],
                message: 'Deadline is too far in the future',
            });
        }
    });

export const savedObjectiveSchema = objectiveSchema.extend({
    _id: z.string(),
});

export type Objective = z.infer<typeof savedObjectiveSchema>;
export type CreateObjective = z.infer<typeof objectiveSchema>;
export type SavedObjectiveForm = z.infer<typeof savedObjectiveSchema>;
