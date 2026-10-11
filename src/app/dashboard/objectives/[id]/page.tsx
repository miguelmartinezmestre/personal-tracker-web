import { ObjectiveDetail } from '@/features/objectives';
import {
    objectivesListHref,
    parseObjectiveStatusFilter,
} from '@/features/objectives/lib/status-filter';
import { translatedPageTitle } from '@/lib/page-metadata';

export const generateMetadata = translatedPageTitle('Sidebar', 'objectives');

export default async function ObjectivePage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ status?: string | string[] }>;
}) {
    const [{ id }, { status }] = await Promise.all([params, searchParams]);
    return (
        <ObjectiveDetail
            objectiveId={id}
            listHref={objectivesListHref(parseObjectiveStatusFilter(status))}
        />
    );
}
