'use client';

import { Suspense } from 'react';
import { ResponsiveObjectivesView } from '@/components/objectives/responsive-objectives-view';
import CreateObjectiveFormModal from '@/components/objectives/objective-form-create-modal';

export default function ObjectivesPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Objectives</h1>
                    <p className="text-muted-foreground">
                        Manage your personal and professional goals.
                    </p>
                </div>
                <CreateObjectiveFormModal />
            </div>
            <Suspense fallback={<div>Loading objectives...</div>}>
                <ResponsiveObjectivesView />
            </Suspense>
        </div>
    );
}
