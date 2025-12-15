'use client';

import { Suspense } from 'react';
import SessionsTable from '@/components/sessions/sessions-table';

export default function SessionsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Sessions</h1>
                <p className="text-muted-foreground">Manage your active sessions.</p>
            </div>
            <Suspense fallback={<div>Loading sessions...</div>}>
                <SessionsTable />
            </Suspense>
        </div>
    );
}
