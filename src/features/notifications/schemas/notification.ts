import { z } from 'zod';
import { NOTIFICATION_TYPE } from '@/convex/utils/constants';

export const notificationTypeEnum = z.enum([
    NOTIFICATION_TYPE.DEADLINE,
    NOTIFICATION_TYPE.PROGRESS,
    NOTIFICATION_TYPE.STATUS,
    NOTIFICATION_TYPE.ACHIEVEMENT,
    NOTIFICATION_TYPE.REMINDER,
]);

export const notificationSchema = z.object({
    objective: z.string().min(1),
    notificationType: notificationTypeEnum,
    notificationDate: z.date(),
    message: z.string().min(1),
});

export const savedNotificationSchema = notificationSchema.extend({
    _id: z.string(),
    user: z.string(),
    read: z.boolean(),
    createdAt: z.number(),
    updatedAt: z.number(),
});

export type CreateNotification = z.infer<typeof notificationSchema>;
