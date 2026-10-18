'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { DeleteConfirmationDialog } from '@/components/data-table/components/delete-confirmation-dialog';
import { getErrorLocale, resolveErrorMessage } from '@/lib/error-messages';
import {
    useLeaveOrganization,
    usePersonalOrganizationId,
} from '@/features/organizations/hooks/use-organizations';

export default function OrganizationLeaveButton({
    organizationId,
    organizationName,
}: {
    organizationId: string;
    organizationName: string;
}) {
    const t = useTranslations('OrganizationMembers');
    const router = useRouter();
    const session = useQuery(convexQuery(api.organizations.getCurrentSession, {}));
    const personalOrganization = usePersonalOrganizationId();
    const leaveOrganization = useLeaveOrganization();
    const isActive = session.data?.session.activeOrganizationId === organizationId;
    const personalOrganizationId = personalOrganization.data ?? undefined;
    // Without both answers we cannot tell whether to switch first; leaving the active
    // organization without a fallback would end the session's organization context.
    const isReady = !session.isPending && !personalOrganization.isPending;
    const missingFallback = isActive && !personalOrganizationId;

    return (
        <DeleteConfirmationDialog
            title={t('leave.confirmTitle', { name: organizationName })}
            description={t('leave.confirmDescription')}
            confirmLabel={t('leave.confirm')}
            cancelLabel={t('confirm.cancel')}
            isLoading={leaveOrganization.isPending}
            trigger={
                <Button
                    variant="outline"
                    className="gap-2"
                    disabled={!isReady}
                    data-testid="organization-leave"
                >
                    <LogOut className="h-4 w-4" aria-hidden />
                    {t('leave.button')}
                </Button>
            }
            onConfirm={async () => {
                if (missingFallback) {
                    toast.error(resolveErrorMessage(null, getErrorLocale()));

                    return;
                }

                try {
                    await leaveOrganization.mutateAsync({
                        organizationId,
                        fallbackOrganizationId: isActive ? personalOrganizationId : undefined,
                    });
                    toast.success(t('leave.success', { name: organizationName }));
                    router.push('/dashboard/organizations');
                    router.refresh();
                } catch (error) {
                    toast.error(resolveErrorMessage(error, getErrorLocale()));
                }
            }}
        />
    );
}
