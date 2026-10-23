export const OBJECTIVE_TITLE_MAX_LENGTH = 120;

export const OBJECTIVE_DESCRIPTION_MAX_LENGTH = 2000;

export const OBJECTIVE_UNIT_MAX_LENGTH = 32;

export const PROGRESS_COMMENT_MAX_LENGTH = 500;

export const OBJECTIVE_DELETION_BATCH_SIZE = 50;

// Every stored measurement (start, target, current value and each progress difference).
export const MAX_METRIC = 1_000_000_000;

export const DEFAULT_DUE_SOON_DAYS = 7;

export const MAX_DUE_SOON_DAYS = 365;

// Progress can be dated up to five years back.
export const PROGRESS_HISTORY_DAYS = 5 * 365;

export const PROGRESS_SERIES_LIMIT = 500;

// Individual permissions per objective; beyond this the member role is the better fit.
export const MAX_OBJECTIVE_GRANTS = 100;

export const MEMBER_ACCESS_REMOVAL_BATCH_SIZE = 50;
