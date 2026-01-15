import { getTranslations } from 'next-intl/server';
import CreateOrganizationFormModal from '@/features/organizations/components/organization-form-create-modal';
import OrganizationsTable from '@/features/organizations/components/organization-table';

export default async function Organizations() {
    const t = await getTranslations('Organizations');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">{t('title')}</h1>
                <CreateOrganizationFormModal />
            </div>
            <OrganizationsTable />
        </div>
    );
}
