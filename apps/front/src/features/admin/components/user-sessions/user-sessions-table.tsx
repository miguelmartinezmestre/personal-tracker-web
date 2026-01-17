'use client';

import { useState } from 'react';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { DataTable } from '@/features/table/components/table';
import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useUserSessionsTableColumns } from './user-sessions-table-columns';
import { useConfirmRevokeAllSessions } from './user-sessions-table-actions';
import { api } from '@repo/backend/convex/_generated/api';
import { convexQuery } from '@convex-dev/react-query';
import { useQuery } from '@tanstack/react-query';

export function UserSessions() {
    const t = useTranslations('Admin');
    const tCommon = useTranslations('Common');
    const columns = useUserSessionsTableColumns();
    const [userId, setUserId] = useState('');
    const { revokeAllSessions, isRevokingAllSessions } = useConfirmRevokeAllSessions();

    const { data: sessions, isLoading } = useQuery(convexQuery(api.admin.listUserSessions, { userId, paginationOpts: { numItems: 10, cursor: null } }));

    if(!isLoading) {
        console.log(sessions);
    }

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <Input
                    type="text"
                    placeholder={tCommon('placeholders.userIdForSessions')}
                    value={userId}
                    onChange={e => setUserId(e.target.value)}
                    className="flex-1"
                    data-testid="user-sessions-userid-input"
                />
                {userId && (
                    <Button
                        variant="destructive"
                        onClick={() => revokeAllSessions({ userId })}
                        disabled={isRevokingAllSessions}
                        data-testid="user-sessions-revoke-all-button"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {t('userSessions.buttons.revokeAll')}
                    </Button>
                )}
            </div>
            {userId ? (
                <>
                    <DataTable columns={columns} data={sessions?.page ?? []} isLoading={isLoading} />
                    {sessions?.page?.length === 0 && !isLoading && (
                        <p className="text-center text-muted-foreground py-8">
                            {t('userSessions.emptyWithUser')}
                        </p>
                    )}
                </>
            ) : (
                <p className="text-center text-muted-foreground py-8">
                    {t('userSessions.emptyNoUser')}
                </p>
            )}
        </div>
    );
}
