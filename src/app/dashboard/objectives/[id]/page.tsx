import { ObjectiveDetail } from '@/features/objectives';
import {
    objectivesListHref,
    parseObjectiveListFilters,
} from '@/features/objectives/lib/list-filters';
import { translatedPageTitle } from '@/lib/page-metadata';

export const generateMetadata = translatedPageTitle('Sidebar', 'objectives');

export default async function ObjectivePage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const [{ id }, filters] = await Promise.all([params, searchParams]);

    return (
        <ObjectiveDetail
            objectiveId={id}
            listHref={objectivesListHref(parseObjectiveListFilters(filters))}
        />
    );
}
