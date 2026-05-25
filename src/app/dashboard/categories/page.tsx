import { preloadAuthQuery } from '@/features/auth/server';
import { api } from '@/convex/_generated/api';
import { CategoriesLayout } from '@/features/categories';
import { redirect } from 'next/navigation';
import { Preloaded } from 'convex/react';

export default async function CategoriesPage() {
    let preloadedCategoriesQuery: Preloaded<typeof api.categories.getCategoriesByUser>;

    try {
        preloadedCategoriesQuery = await preloadAuthQuery(api.categories.getCategoriesByUser, {
            paginationOpts: { numItems: 20, cursor: null },
        });
    } catch {
        redirect('/dashboard/home');
    }

    return <CategoriesLayout preloadedCategoriesQuery={preloadedCategoriesQuery} />;
}
