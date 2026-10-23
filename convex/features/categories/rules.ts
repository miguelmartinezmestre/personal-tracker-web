import { ConvexError } from 'convex/values';
import type { Doc, Id } from '../../_generated/dataModel';
import { ERROR_CODES } from '../../shared/errorCodes';
import { isOrganizationAdminRole } from '../organizations/roles';
import { CATEGORY_COLOR_PATTERN, CATEGORY_ICONS } from './constants';

const CATEGORY_ICON_SET = new Set<string>(CATEGORY_ICONS);

export function normalizeCategory(category: { name: string; color: string; icon?: string }) {
    const name = category.name.trim();

    if (
        name.length === 0 ||
        !CATEGORY_COLOR_PATTERN.test(category.color) ||
        (category.icon !== undefined && !CATEGORY_ICON_SET.has(category.icon))
    ) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }

    return { name, color: category.color, icon: category.icon };
}

// Edited and deleted only by its creator, the owner and the admins (REQ-CATEGORIAS-003).
export function canManageCategory(
    actor: { userId: Id<'user'>; memberRole: string | null },
    category: Doc<'categories'>
) {
    return category.userId === actor.userId || isOrganizationAdminRole(actor.memberRole);
}
