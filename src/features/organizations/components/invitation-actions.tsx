'use client';

import { useState } from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Invitation } from '@/features/organizations/hooks/use-invitations';
import { useTranslations } from 'next-intl';

interface InvitationActionsProps {
    invitation: Invitation;
    onAccept: () => void;
    onReject: () => void;
    isAccepting: boolean;
    isRejecting: boolean;
    isResponseDisabled: boolean;
}

/** Accept (after confirming the organization switch) and reject buttons for one invitation. */
export function InvitationActions({
    invitation,
    onAccept,
    onReject,
    isAccepting,
    isRejecting,
    isResponseDisabled,
}: InvitationActionsProps) {
    const t = useTranslations('Invitations');
    const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
    const disabled = isAccepting || isRejecting || isResponseDisabled;

    const handleConfirmAccept = () => {
        onAccept();
        setShowAcceptConfirm(false);
    };

    return (
        <>
            <div className="flex justify-end gap-2">
                <Button
                    size="sm"
                    onClick={() => setShowAcceptConfirm(true)}
                    disabled={disabled}
                    data-testid="invitation-accept-button"
                    aria-label={t('accept')}
                >
                    <Check aria-hidden />
                    {/* Icon-only on narrow screens so both buttons fit beside the name. */}
                    <span className="hidden sm:inline">{t('accept')}</span>
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={onReject}
                    disabled={disabled}
                    data-testid="invitation-reject-button"
                    aria-label={t('reject')}
                >
                    <X aria-hidden />
                    <span className="hidden sm:inline">{t('reject')}</span>
                </Button>
            </div>

            <AlertDialog open={showAcceptConfirm} onOpenChange={setShowAcceptConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                            {t('confirmAcceptTitle')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('confirmAcceptDescription', {
                                orgName: invitation.organization?.name ?? '',
                            })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isAccepting}>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmAccept}
                            disabled={isAccepting || isResponseDisabled}
                            className="bg-primary"
                            data-testid="invitation-accept-confirm-button"
                        >
                            {isAccepting ? t('joining') : t('confirmJoin')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
