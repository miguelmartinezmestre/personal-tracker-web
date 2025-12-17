import { getTranslations } from 'next-intl/server';
import CreateTeamFormModal from '@/components/teams/team-form-create-modal';
import TeamsTable from '@/components/teams/team-table';

export default async function Teams() {
    const t = await getTranslations('Teams');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">{t('title')}</h1>
                <CreateTeamFormModal />
            </div>
            <TeamsTable />
        </div>
    );
}

