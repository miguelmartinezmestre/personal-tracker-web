import { Home } from '@/features/dashboard';
import { translatedPageTitle } from '@/lib/page-metadata';

export const generateMetadata = translatedPageTitle('Sidebar', 'home');

export default function HomePage() {
    return <Home />;
}
