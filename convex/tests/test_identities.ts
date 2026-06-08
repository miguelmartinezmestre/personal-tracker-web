import type { Id } from '../_generated/dataModel';
import type { UserIdentity } from 'convex/server';
import type { TestUserData } from './test_helpers';

export function identityFor(user: TestUserData, sessionId?: Id<'session'>): Partial<UserIdentity> {
    return {
        subject: user.docId,
        role: user.role ?? 'user',
        email: user.email,
        name: user.name,
        password: user.password ?? 'test-password',
        emailVerified: false,
        createdAt: Date.now(),
        userId: user.docId,
        sessionId,
        image: 'https://example.com/image.png',
        banExpires: null,
        banReason: null,
        banned: false,
    } as Partial<UserIdentity>;
}
