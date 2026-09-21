import { ConvexError } from 'convex/values';
import { CATEGORY_COLOR_PATTERN, CATEGORY_ICONS } from './inputConstraints';
import { ERROR_CODES } from './constants';

const CATEGORY_ICON_SET = new Set<string>(CATEGORY_ICONS);

export function normalizeRequiredBoundedString(value: string, maxLength: number): string {
    const normalized = value.trim();
    if (normalized.length === 0 || normalized.length > maxLength) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }
    return normalized;
}

export function assertOptionalBoundedString(
    value: string | null | undefined,
    maxLength: number
): void {
    if (value !== null && value !== undefined && value.length > maxLength) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }
}

export function assertValidCategoryColor(color: string): void {
    if (!CATEGORY_COLOR_PATTERN.test(color)) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }
}

export function assertValidCategoryIcon(icon: string | null | undefined): void {
    if (icon !== null && icon !== undefined && !CATEGORY_ICON_SET.has(icon)) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }
}
