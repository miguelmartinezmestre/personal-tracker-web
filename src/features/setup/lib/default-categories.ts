import { DEFAULT_CATEGORIES as SHARED_DEFAULT_CATEGORIES } from '@/convex/constants';
import type { SetupCategory } from '../schemas/setup-schema';

export const DEFAULT_CATEGORIES: SetupCategory[] = SHARED_DEFAULT_CATEGORIES.map(category => ({
    ...category,
}));
