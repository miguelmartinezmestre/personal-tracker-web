import { z } from 'zod';

export const notificationTypeEnum = z.enum([
    'deadline',
    'progress',
    'status',
    'achievement',
    'reminder',
]);

export const notificationSchema = z.object({
    objective: z.string().min(1, { message: 'Objective is required' }),
    notificationType: notificationTypeEnum,
    notificationDate: z.date(),
    message: z.string().min(1, { message: 'Message is required' }),
});

export const savedNotificationSchema = notificationSchema.extend({
    _id: z.string(),
    user: z.string(),
    read: z.boolean(),
    createdAt: z.number(),
    updatedAt: z.number(),
});

export type CreateNotification = z.infer<typeof notificationSchema>;
