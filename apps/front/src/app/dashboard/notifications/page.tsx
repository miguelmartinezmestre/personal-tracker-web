'use client';

import { Suspense } from 'react';

export default function NotificationsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
                <p className="text-muted-foreground">View your notifications and updates.</p>
            </div>
            <Suspense fallback={<div>Loading notifications...</div>}>
                <div className="text-center py-12">
                    <p className="text-muted-foreground">No notifications yet.</p>
                </div>
            </Suspense>
        </div>
    );
}
