import CreateObjectiveFormModal from '@/components/objectives/objective-form-create-modal';
import ObjetivesTable from '@/components/objectives/objetives-table';

export default function Objectives() {
    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Objectives </h1>
                <CreateObjectiveFormModal />
            </div>
            <ObjetivesTable />
        </div>
    );
}
