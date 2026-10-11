import { ObjectivesLayout } from '@/features/objectives';
import { parseObjectiveStatusFilter } from '@/features/objectives/lib/status-filter';
import { translatedPageTitle } from '@/lib/page-metadata';

export const generateMetadata = translatedPageTitle('Sidebar', 'objectives');

export default async function ObjectivesPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string | string[] }>;
}) {
    const { status } = await searchParams;
    return <ObjectivesLayout initialStatus={parseObjectiveStatusFilter(status)} />;
}
