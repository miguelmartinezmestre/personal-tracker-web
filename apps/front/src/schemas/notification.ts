import { z } from 'zod';

export const notificationSchema = z.object({
    objective: z.string().min(1, { message: 'Objective is required' }),
    notificationType: z.string().min(1, { message: 'Notification type is required' }),
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

