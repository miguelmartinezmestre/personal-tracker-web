import CreateObjectiveFormModal from '@/components/objectives/objective-form-create-modal';
import ObjetivesTable from '@/components/objectives/objetives-table';
import { getTranslations } from 'next-intl/server';

export default async function Objectives() {
    const t = await getTranslations('Objectives');
    return (
        <>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">{t('title')}</h1>
                <CreateObjectiveFormModal />
            </div>
            <ObjetivesTable />
        </>
    );
}
