import { describe, it, expect } from 'vitest';
import { auditLogSchema, savedAuditLogSchema } from './audit-log';

describe('auditLogSchema', () => {
    it('should validate a valid audit log', () => {
        const validLog = {
            id: 1,
            userId: 100,
            action: 'user_login',
        };

        const result = auditLogSchema.safeParse(validLog);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.id).toBe(1);
            expect(result.data.userId).toBe(100);
            expect(result.data.action).toBe('user_login');
        }
    });

    it('should require id', () => {
        const invalidLog = {
            userId: 100,
            action: 'user_login',
        };

        const result = auditLogSchema.safeParse(invalidLog);
        expect(result.success).toBe(false);
        if (!result.success) {
            const idError = result.error.issues.find(issue => issue.path.includes('id'));
            expect(idError).toBeDefined();
        }
    });

    it('should require userId', () => {
        const invalidLog = {
            id: 1,
            action: 'user_login',
        };

        const result = auditLogSchema.safeParse(invalidLog);
        expect(result.success).toBe(false);
        if (!result.success) {
            const userIdError = result.error.issues.find(issue => issue.path.includes('userId'));
            expect(userIdError).toBeDefined();
        }
    });

    it('should require action', () => {
        const invalidLog = {
            id: 1,
            userId: 100,
        };

        const result = auditLogSchema.safeParse(invalidLog);
        expect(result.success).toBe(false);
        if (!result.success) {
            const actionError = result.error.issues.find(issue => issue.path.includes('action'));
            expect(actionError).toBeDefined();
        }
    });

    it('should validate id as number', () => {
        const invalidLog = {
            id: 'not-a-number',
            userId: 100,
            action: 'user_login',
        };

        const result = auditLogSchema.safeParse(invalidLog);
        expect(result.success).toBe(false);
    });

    it('should validate userId as number', () => {
        const invalidLog = {
            id: 1,
            userId: 'not-a-number',
            action: 'user_login',
        };

        const result = auditLogSchema.safeParse(invalidLog);
        expect(result.success).toBe(false);
    });

    it('should accept various action strings', () => {
        const actions = [
            'user_login',
            'user_logout',
            'objective_created',
            'objective_deleted',
            'settings_updated',
        ];

        actions.forEach(action => {
            const result = auditLogSchema.safeParse({
                id: 1,
                userId: 100,
                action,
            });
            expect(result.success).toBe(true);
        });
    });
});

describe('savedAuditLogSchema', () => {
    it('should validate a saved audit log with _id', () => {
        const savedLog = {
            _id: 'log-123',
            id: 1,
            userId: 100,
            action: 'user_login',
        };

        const result = savedAuditLogSchema.safeParse(savedLog);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data._id).toBe('log-123');
        }
    });

    it('should require _id for saved audit log', () => {
        const invalidSavedLog = {
            id: 1,
            userId: 100,
            action: 'user_login',
        };

        const result = savedAuditLogSchema.safeParse(invalidSavedLog);
        expect(result.success).toBe(false);
        if (!result.success) {
            const idError = result.error.issues.find(issue => issue.path.includes('_id'));
            expect(idError).toBeDefined();
        }
    });
});
