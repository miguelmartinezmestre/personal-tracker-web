import { CategoriesPage } from '@/features/categories';
import { translatedPageTitle } from '@/lib/page-metadata';

export const generateMetadata = translatedPageTitle('Sidebar', 'categories');

export default function DashboardCategoriesPage() {
    return <CategoriesPage />;
}
