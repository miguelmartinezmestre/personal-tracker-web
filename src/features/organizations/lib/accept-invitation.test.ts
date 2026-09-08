import { describe, expect, it, vi, beforeEach } from 'vitest';

const client = vi.hoisted(() => ({
    organization: { acceptInvitation: vi.fn(), setActive: vi.fn() },
    getSession: vi.fn(),
}));
vi.mock('@/features/auth/client', () => ({ authClient: client }));
import {
    acceptInvitationAndActivateOrganization,
    activateAcceptedOrganization,
} from './accept-invitation';

describe('invitation activation recovery', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        client.organization.acceptInvitation.mockResolvedValue({
            data: { invitation: { organizationId: 'org-1' } },
            error: null,
        });
        client.organization.setActive.mockResolvedValue({ data: { id: 'org-1' }, error: null });
        client.getSession.mockResolvedValue({ data: {}, error: null });
    });

    it('retries activation after a partial failure without accepting twice', async () => {
        client.organization.setActive.mockResolvedValueOnce({
            error: { message: 'Temporary activation failure' },
            data: null,
        });
        const result = await acceptInvitationAndActivateOrganization({
            invitationId: 'invite-1',
            organizationId: 'org-1',
        });
        expect(result.status).toBe('acceptedActivationPending');
        expect(client.getSession).not.toHaveBeenCalled();
        await activateAcceptedOrganization(result.organizationId);
        expect(client.organization.acceptInvitation).toHaveBeenCalledExactlyOnceWith({
            invitationId: 'invite-1',
        });
        expect(client.organization.setActive).toHaveBeenCalledTimes(2);
        expect(client.getSession).toHaveBeenCalledExactlyOnceWith({
            query: { disableCookieCache: true },
        });
    });

    it('keeps acceptance failed when the invitation was rejected by the backend', async () => {
        client.organization.acceptInvitation.mockResolvedValueOnce({
            error: { message: 'Expired invitation' },
            data: null,
        });
        await expect(
            acceptInvitationAndActivateOrganization({ invitationId: 'expired' })
        ).rejects.toThrow('Expired invitation');
        expect(client.organization.setActive).not.toHaveBeenCalled();
    });

    it('also recovers when activation succeeded but session refresh failed', async () => {
        client.getSession.mockRejectedValueOnce(new Error('Network interrupted'));
        const result = await acceptInvitationAndActivateOrganization({
            invitationId: 'invite-1',
            organizationId: 'org-1',
        });
        expect(result.status).toBe('acceptedActivationPending');
        await activateAcceptedOrganization(result.organizationId);
        expect(client.organization.acceptInvitation).toHaveBeenCalledTimes(1);
        expect(client.getSession).toHaveBeenCalledTimes(2);
    });
});
