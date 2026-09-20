import { describe, expect, test } from 'vitest';
import { resolveActorUserId, sanitizeAuditMetadata } from '../domain/audit/privacy';
import { asTestId } from './testCasts';

describe('audit log privacy', () => {
    test('redacts sensitive fields and keeps safe primitive metadata', () => {
        const userId = asTestId<'user'>('audit-subject');

        const metadata = sanitizeAuditMetadata('user', {
            before: {
                _id: String(userId),
                name: 'Old Name',
                email: 'private@example.com',
                password: 'old-password',
                hashedPassword: 'old-hash',
                status: 'active',
                count: 42,
            },
            after: {
                _id: String(userId),
                title: 'Private title',
                clientSecret: 'secret-value',
                profile: 'profile-ref',
                role: 'user',
                count: 43,
            },
            context: 'security.redaction',
        });

        expect(metadata?.before).toEqual({ _id: String(userId) });
        expect(metadata?.after).toEqual({ _id: String(userId), role: 'user' });
        expect(metadata?.context).toBe('security.redaction');
    });

    test('stores an actor only when it differs from the affected user', () => {
        const subjectId = asTestId<'user'>('audit-subject');
        const actorId = asTestId<'user'>('audit-actor');

        expect(resolveActorUserId(subjectId, actorId)).toBe(actorId);
        expect(resolveActorUserId(subjectId, subjectId)).toBeUndefined();
        expect(resolveActorUserId(subjectId, undefined)).toBeUndefined();
    });

    test('keeps invitation operations useful without storing email PII', () => {
        const organizationId = asTestId<'organization'>('audit-organization');

        const metadata = sanitizeAuditMetadata('invitation', {
            after: {
                _id: 'invite-123',
                email: 'invitee@example.com',
                organizationId: String(organizationId),
                role: 'member',
                status: 'pending',
            },
        });

        expect(metadata?.after).toEqual({
            _id: 'invite-123',
            organizationId: String(organizationId),
            role: 'member',
            status: 'pending',
        });
    });
});
