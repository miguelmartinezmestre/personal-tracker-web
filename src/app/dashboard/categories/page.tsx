import { preloadAuthQuery } from '@/features/auth/server';
import { api } from '@/convex/_generated/api';
import { CategoriesLayout } from '@/features/categories';
import { redirect } from 'next/navigation';
import { Preloaded } from 'convex/react';
import { DEFAULT_PAGINATION_OPTS } from '@/lib/pagination';

export default async function CategoriesPage() {
    let preloadedCategoriesQuery: Preloaded<typeof api.categories.getCategoriesByUser>;

    try {
        preloadedCategoriesQuery = await preloadAuthQuery(api.categories.getCategoriesByUser, {
            paginationOpts: DEFAULT_PAGINATION_OPTS,
        });
    } catch {
        redirect('/dashboard/home');
    }

    return <CategoriesLayout preloadedCategoriesQuery={preloadedCategoriesQuery} />;
}
