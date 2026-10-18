import { z } from 'zod';
import { CATEGORY_COLOR_PATTERN, CATEGORY_ICONS } from '@/convex/features/categories/constants';

export const categoryColorSchema = z
    .string()
    .regex(CATEGORY_COLOR_PATTERN, 'Color must be a valid hex code (e.g. #FF5733)');

export const categoryIconSchema = z.enum(CATEGORY_ICONS);
