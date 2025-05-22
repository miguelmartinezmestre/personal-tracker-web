import { z } from "zod";


export const notificationSchema = z.object({
    userId: z.number(),
    objectiveId: z.number(),
    notificationType: z.string(),
    notificationDate: z.date(),
    message: z.string(),
    read: z.boolean(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const savedNotificationSchema = notificationSchema.extend({
    id: z.number(),
});

export type Notification = z.infer<typeof savedNotificationSchema>;
export type CreateNotification = z.infer<typeof notificationSchema>;