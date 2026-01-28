'use client';

import { useTranslations } from 'next-intl';
import CreateOrganizationFormModal from './organization-form-create-modal';
import OrganizationsTable from './organization-table';

export default function OrganizationsLayout() {
    const t = useTranslations('Organizations');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold" data-testid="organizations-title">
                    {t('title')}
                </h1>
                <CreateOrganizationFormModal />
            </div>
            <OrganizationsTable />
        </div>
    );
}
