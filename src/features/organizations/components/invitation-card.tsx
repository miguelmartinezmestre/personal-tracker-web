'use client';

import { Mail, Building2, User, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Invitation } from '@/features/organizations/hooks/use-invitations';
import { useTranslations } from 'next-intl';

interface InvitationCardProps {
    invitation: Invitation;
    onAccept: () => void;
    onReject: () => void;
    isAccepting?: boolean;
    isRejecting?: boolean;
}

export function InvitationCard({
    invitation,
    onAccept,
    onReject,
    isAccepting = false,
    isRejecting = false,
}: InvitationCardProps) {
    const t = useTranslations('Invitations');

    const getRoleBadgeVariant = (role: string) => {
        switch (role) {
            case 'owner':
                return 'default';
            case 'admin':
                return 'secondary';
            default:
                return 'outline';
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            {invitation.organization?.name}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {invitation.email}
                        </CardDescription>
                    </div>
                    <Badge variant={getRoleBadgeVariant(invitation.role)}>{invitation.role}</Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>
                            {t('invitedBy')}: {invitation.inviter?.name ?? 'Unknown'}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={onAccept}
                            disabled={isAccepting || isRejecting}
                            className="flex-1"
                            data-testid="invitation-accept-button"
                        >
                            <Check className="mr-2 h-4 w-4" />
                            {t('accept')}
                        </Button>
                        <Button
                            onClick={onReject}
                            disabled={isAccepting || isRejecting}
                            variant="outline"
                            className="flex-1"
                            data-testid="invitation-reject-button"
                        >
                            <X className="mr-2 h-4 w-4" />
                            {t('reject')}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
