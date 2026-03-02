'use client';

import { useTranslations } from 'next-intl';
import CreateOrganizationFormModal from './organization-form-create-modal';
import OrganizationsTable from './organization-table';

export default function OrganizationsLayout() {
  const t = useTranslations('Organizations');

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="min-w-0 text-2xl font-bold" data-testid="organizations-title">
          {t('title')}
        </h1>
        <div className="w-full sm:w-auto">
          <CreateOrganizationFormModal />
        </div>
      </div>
      <OrganizationsTable />
    </div>
  );
}
