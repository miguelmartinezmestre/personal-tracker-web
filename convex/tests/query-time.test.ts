import { describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { ERROR_CODES } from '../constants';
import { initConvexTest } from './test.helper';

describe('reference timestamp validation', () => {
    const t = initConvexTest();

    test('accepts a client clock skew within one day', async () => {
        const now = Date.now();

        await expect(
            t.query(api.organizations.getPublicInvitationStatus, {
                invitationId: 'not-a-convex-id',
                now: now - 23 * 60 * 60 * 1000,
            })
        ).resolves.toEqual({ isValid: false });
        await expect(
            t.query(api.organizations.getPublicInvitationStatus, {
                invitationId: 'not-a-convex-id',
                now: now + 23 * 60 * 60 * 1000,
            })
        ).resolves.toEqual({ isValid: false });
    });

    test('rejects stale, far-future, and non-finite timestamps', async () => {
        const now = Date.now();
        const queryWithNow = (referenceTime: number) =>
            t.query(api.organizations.getPublicInvitationStatus, {
                invitationId: 'not-a-convex-id',
                now: referenceTime,
            });

        await expect(queryWithNow(now - 25 * 60 * 60 * 1000)).rejects.toThrow(
            ERROR_CODES.VALIDATION_ERROR
        );
        await expect(queryWithNow(now + 25 * 60 * 60 * 1000)).rejects.toThrow(
            ERROR_CODES.VALIDATION_ERROR
        );
        await expect(queryWithNow(Number.POSITIVE_INFINITY)).rejects.toThrow(
            ERROR_CODES.VALIDATION_ERROR
        );
    });
});
