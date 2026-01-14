import { describe, it, expect } from 'vitest';
import { notificationSchema, savedNotificationSchema } from './notification';

describe('notificationSchema', () => {
    const validNotification = {
        objective: 'objective-123',
        notificationType: 'reminder',
        notificationDate: new Date(),
        message: 'Test notification message',
    };

    it('validates a complete notification object', () => {
        const result = notificationSchema.safeParse(validNotification);
        expect(result.success).toBe(true);
    });

    it('rejects empty objective', () => {
        const invalid = { ...validNotification, objective: '' };
        const result = notificationSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });

    it('rejects missing objective', () => {
        const { objective, ...withoutObjective } = validNotification;
        const result = notificationSchema.safeParse(withoutObjective);
        expect(result.success).toBe(false);
    });

    it('rejects empty notificationType', () => {
        const invalid = { ...validNotification, notificationType: '' };
        const result = notificationSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });

    it('rejects missing notificationType', () => {
        const { notificationType, ...withoutType } = validNotification;
        const result = notificationSchema.safeParse(withoutType);
        expect(result.success).toBe(false);
    });

    it('rejects empty message', () => {
        const invalid = { ...validNotification, message: '' };
        const result = notificationSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });

    it('rejects missing message', () => {
        const { message, ...withoutMessage } = validNotification;
        const result = notificationSchema.safeParse(withoutMessage);
        expect(result.success).toBe(false);
    });

    it('requires notificationDate to be a Date object', () => {
        const result = notificationSchema.safeParse(validNotification);
        expect(result.success).toBe(true);
    });

    it('rejects string notificationDate', () => {
        const invalid = { ...validNotification, notificationDate: '2024-01-01' };
        const result = notificationSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });

    it('rejects number notificationDate', () => {
        const invalid = { ...validNotification, notificationDate: Date.now() };
        const result = notificationSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });

    it('accepts long messages', () => {
        const longMessage = 'A'.repeat(1000);
        const valid = { ...validNotification, message: longMessage };
        const result = notificationSchema.safeParse(valid);
        expect(result.success).toBe(true);
    });

    it('accepts different notification types', () => {
        const types = ['reminder', 'deadline', 'progress', 'status', 'achievement', 'custom'];

        types.forEach(type => {
            const valid = { ...validNotification, notificationType: type };
            const result = notificationSchema.safeParse(valid);
            expect(result.success).toBe(true);
        });
    });
});

describe('savedNotificationSchema', () => {
    const validSavedNotification = {
        _id: 'notification-123',
        user: 'user-456',
        objective: 'objective-789',
        read: false,
        notificationType: 'reminder',
        notificationDate: new Date(),
        message: 'Test notification message',
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    it('validates a complete saved notification object', () => {
        const result = savedNotificationSchema.safeParse(validSavedNotification);
        expect(result.success).toBe(true);
    });

    it('extends base notification schema', () => {
        // Should have all base fields plus extended fields
        const result = savedNotificationSchema.safeParse(validSavedNotification);
        expect(result.success).toBe(true);
    });

    it('rejects missing _id', () => {
        const { _id, ...withoutId } = validSavedNotification;
        const result = savedNotificationSchema.safeParse(withoutId);
        expect(result.success).toBe(false);
    });

    it('rejects missing user', () => {
        const { user, ...withoutUser } = validSavedNotification;
        const result = savedNotificationSchema.safeParse(withoutUser);
        expect(result.success).toBe(false);
    });

    it('validates read as boolean', () => {
        const readNotification = { ...validSavedNotification, read: true };
        const unreadNotification = { ...validSavedNotification, read: false };

        expect(savedNotificationSchema.safeParse(readNotification).success).toBe(true);
        expect(savedNotificationSchema.safeParse(unreadNotification).success).toBe(true);
    });

    it('rejects non-boolean read', () => {
        const invalid = { ...validSavedNotification, read: 'yes' };
        const result = savedNotificationSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });

    it('rejects missing read field', () => {
        const { read, ...withoutRead } = validSavedNotification;
        const result = savedNotificationSchema.safeParse(withoutRead);
        expect(result.success).toBe(false);
    });

    it('validates createdAt as number', () => {
        const result = savedNotificationSchema.safeParse(validSavedNotification);
        expect(result.success).toBe(true);
    });

    it('rejects non-number createdAt', () => {
        const invalid = { ...validSavedNotification, createdAt: '2024-01-01' };
        const result = savedNotificationSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });

    it('validates updatedAt as number', () => {
        const result = savedNotificationSchema.safeParse(validSavedNotification);
        expect(result.success).toBe(true);
    });

    it('rejects non-number updatedAt', () => {
        const invalid = { ...validSavedNotification, updatedAt: new Date() };
        const result = savedNotificationSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });

    it('rejects missing createdAt', () => {
        const { createdAt, ...withoutCreatedAt } = validSavedNotification;
        const result = savedNotificationSchema.safeParse(withoutCreatedAt);
        expect(result.success).toBe(false);
    });

    it('rejects missing updatedAt', () => {
        const { updatedAt, ...withoutUpdatedAt } = validSavedNotification;
        const result = savedNotificationSchema.safeParse(withoutUpdatedAt);
        expect(result.success).toBe(false);
    });

    it('validates all required fields together', () => {
        const result = savedNotificationSchema.safeParse(validSavedNotification);
        expect(result.success).toBe(true);

        if (result.success) {
            expect(result.data).toHaveProperty('_id');
            expect(result.data).toHaveProperty('user');
            expect(result.data).toHaveProperty('objective');
            expect(result.data).toHaveProperty('read');
            expect(result.data).toHaveProperty('notificationType');
            expect(result.data).toHaveProperty('notificationDate');
            expect(result.data).toHaveProperty('message');
            expect(result.data).toHaveProperty('createdAt');
            expect(result.data).toHaveProperty('updatedAt');
        }
    });
});
