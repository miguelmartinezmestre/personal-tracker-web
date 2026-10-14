import { ObjectivesLayout } from '@/features/objectives';
import { translatedPageTitle } from '@/lib/page-metadata';

export const generateMetadata = translatedPageTitle('Sidebar', 'objectives');

export default function ObjectivesPage() {
    return <ObjectivesLayout />;
}
