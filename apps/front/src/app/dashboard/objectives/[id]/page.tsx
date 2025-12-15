import { Suspense } from 'react';
import CreateUpdateProgressFormModal from '@/components/update-progress/update-progress-form-create-modal';
import UpdateProgressTable from '@/components/update-progress/update-progress-table';

export default function ObjectiveDetailPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Objectives</h1>
                    <p className="text-muted-foreground">
                        Track progress updates for this objective.
                    </p>
                </div>
                <CreateUpdateProgressFormModal />
            </div>

            <Suspense fallback={<div>Loading progress...</div>}>
                <UpdateProgressTable />
            </Suspense>
        </div>
    );
}
