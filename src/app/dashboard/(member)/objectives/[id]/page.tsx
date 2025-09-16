import UpdateProgressTable from '@/components/update-progress/update-progress-table';
import CreateUpdateProgressFormModal from '@/components/update-progress/update-progress-form-create-modal';

export default async function Objective({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    return (
        <>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Objectives </h1>
                <CreateUpdateProgressFormModal />
            </div>
            <UpdateProgressTable />
        </>
    );
}