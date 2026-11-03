import { ObjectivesTrash } from '@/features/objectives';
import { translatedPageTitle } from '@/lib/page-metadata';

export const generateMetadata = translatedPageTitle('Objectives', 'trash.title');

export default function ObjectivesTrashPage() {
    return <ObjectivesTrash />;
}
