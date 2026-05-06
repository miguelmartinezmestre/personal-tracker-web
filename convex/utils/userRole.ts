import { ConvexError } from 'convex/values';
import { ERROR_CODES, USER_ROLE } from './constants';

export function normalizeGlobalUserRole(role: string): 'admin' | 'user' {
    const r = role.trim();
    const lower = r.toLowerCase();
    if (lower === 'admin' || r === 'ADMIN') {
        return USER_ROLE.ADMIN;
    }
    if (lower === 'user') {
        return USER_ROLE.USER;
    }
    throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
}
