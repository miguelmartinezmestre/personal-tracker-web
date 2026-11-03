import { v, type Infer } from 'convex/values';

export const notificationTypeValidator = v.union(
    v.literal('deadline'),
    v.literal('progress'),
    v.literal('status'),
    v.literal('achievement')
);

export type NotificationType = Infer<typeof notificationTypeValidator>;

const messageParamsValidator = v.record(v.string(), v.union(v.string(), v.number()));

export const noticeValidator = v.object({
    notificationType: notificationTypeValidator,
    messageKey: v.string(),
    messageParams: messageParamsValidator,
    message: v.string(),
});

export type Notice = Infer<typeof noticeValidator>;

export const notificationValidator = v.object({
    id: v.id('notifications'),
    type: notificationTypeValidator,
    date: v.number(),
    read: v.boolean(),
    objectiveId: v.union(v.id('objectives'), v.null()),
    messageKey: v.string(),
    messageParams: messageParamsValidator,
    message: v.string(),
});

export const notificationPreferencesValidator = v.object({
    deadline: v.boolean(),
    progress: v.boolean(),
    status: v.boolean(),
    achievement: v.boolean(),
});
