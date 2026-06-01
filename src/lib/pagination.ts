import { DEFAULT_PAGE_SIZE } from '@shared/pagination';

export { ADMIN_PAGE_SIZE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@shared/pagination';

export const DEFAULT_PAGINATION_OPTS = {
    numItems: DEFAULT_PAGE_SIZE,
    cursor: null as string | null,
};
