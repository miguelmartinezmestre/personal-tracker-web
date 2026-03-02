import { preloadAuthQuery } from '@/features/auth/auth-server';
import { api } from '@/convex/_generated/api';
import CategoriesLayout from '@/features/categories/components/categories-layout';
import { redirect } from 'next/navigation';
import { Preloaded } from 'convex/react';

export default async function CategoriesPage() {
  let preloadedCategoriesQuery: Preloaded<typeof api.categories.getCategoriesByUser>;

  try {
    preloadedCategoriesQuery = await preloadAuthQuery(api.categories.getCategoriesByUser, {});
  } catch (error) {
    console.error(error);
    redirect('/dashboard/home');
  }

  return <CategoriesLayout preloadedCategoriesQuery={preloadedCategoriesQuery} />;
}
