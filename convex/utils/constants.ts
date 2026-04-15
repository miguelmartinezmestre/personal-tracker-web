export const TIME = {
    MINUTE_MS: 60 * 1000,
    HOUR_MS: 60 * 60 * 1000,
    DAY_MS: 24 * 60 * 60 * 1000,
    WEEK_MS: 7 * 24 * 60 * 60 * 1000,
} as const;

export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 10,
    MAX_PAGE_SIZE: 100,
    DASHBOARD_LIMIT: 5,
} as const;

export const DASHBOARD = {
    MONTHS_TO_SHOW: 6,
    DEADLINE_DAYS_AHEAD: 7,
    ACTIVITY_DAYS_BACK: 30,
} as const;

export const OBJECTIVE_STATUS = {
    ACTIVE: 'active',
    COMPLETED: 'completed',
} as const;

export type ObjectiveStatus = (typeof OBJECTIVE_STATUS)[keyof typeof OBJECTIVE_STATUS];

export const OBJECTIVE_SCOPE = {
    PERSONAL: 'personal',
    ORGANIZATION: 'organization',
} as const;

export type ObjectiveScope = (typeof OBJECTIVE_SCOPE)[keyof typeof OBJECTIVE_SCOPE];

export const NOTIFICATION_TYPE = {
    DEADLINE: 'deadline',
    PROGRESS: 'progress',
    STATUS: 'status',
    ACHIEVEMENT: 'achievement',
    REMINDER: 'reminder',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

export const ACHIEVEMENT_TYPE = {
    INDIVIDUAL: 'individual',
    ORGANIZATION: 'organization',
} as const;

export type AchievementType = (typeof ACHIEVEMENT_TYPE)[keyof typeof ACHIEVEMENT_TYPE];

export const ACHIEVEMENT_CATEGORY = {
    MILESTONE: 'milestone',
    STREAK: 'streak',
    COMPLETION: 'completion',
    ACTIVITY: 'activity',
} as const;

export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORY)[keyof typeof ACHIEVEMENT_CATEGORY];

export const ACHIEVEMENT_TIER = {
    BRONZE: 'bronze',
    SILVER: 'silver',
    GOLD: 'gold',
    PLATINUM: 'platinum',
} as const;

export type AchievementTier = (typeof ACHIEVEMENT_TIER)[keyof typeof ACHIEVEMENT_TIER];

export const USER_ROLE = {
    USER: 'user',
    ADMIN: 'admin',
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export const ORGANIZATION_ROLE = {
    OWNER: 'owner',
    ADMIN: 'admin',
    MEMBER: 'member',
} as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLE)[keyof typeof ORGANIZATION_ROLE];

/**
 * Error codes for internationalization
 * Frontend should map these codes to localized messages
 *
 * Spanish translations (for reference):
 * - AUTH_REQUIRED: 'Debes iniciar sesión para realizar esta acción'
 * - FORBIDDEN: 'No tienes permiso para realizar esta acción'
 * - WEAK_PASSWORD: 'La contraseña debe incluir al menos una mayúscula, una minúscula y un número'
 * - NO_ACTIVE_ORG: 'No hay una organización activa seleccionada'
 * - ORG_NOT_FOUND: 'Organización no encontrada'
 * - OBJECTIVE_NOT_FOUND: 'Objetivo no encontrado'
 * - PROGRESS_NOT_FOUND: 'Actualización de progreso no encontrada'
 * - CATEGORY_NOT_FOUND: 'Categoría no encontrada'
 * - USER_NOT_FOUND: 'Usuario no encontrado'
 * - NOT_OBJECTIVE_OWNER: 'No eres el propietario de este objetivo'
 * - NOT_AUTHORIZED_OBJECTIVE: 'No tienes permiso para editar este objetivo'
 * - NOT_AUTHORIZED_NOTIFICATION: 'No tienes permiso para crear notificaciones para este objetivo'
 * - PLATFORM_ALREADY_CONFIGURED: 'La plataforma ya está configurada'
 * - SETUP_USER_COUNT: 'La configuración solo puede completarse cuando existe exactamente un usuario'
 * - SETUP_USER_MISMATCH: 'La configuración debe ser completada por el único usuario registrado'
 * - SETUP_AUTH_REQUIRED: 'Se requiere autenticación para completar la configuración'
 * - INTERNAL_ERROR: 'Error interno del servidor'
 * - VALIDATION_ERROR: 'Error de validación'
 */
export const ERROR_CODES = {
    AUTH_REQUIRED: 'AUTH_REQUIRED',
    FORBIDDEN: 'FORBIDDEN',
    WEAK_PASSWORD: 'WEAK_PASSWORD',

    NO_ACTIVE_ORG: 'NO_ACTIVE_ORG',
    ORG_NOT_FOUND: 'ORG_NOT_FOUND',

    OBJECTIVE_NOT_FOUND: 'OBJECTIVE_NOT_FOUND',
    PROGRESS_NOT_FOUND: 'PROGRESS_NOT_FOUND',
    CATEGORY_NOT_FOUND: 'CATEGORY_NOT_FOUND',
    USER_NOT_FOUND: 'USER_NOT_FOUND',

    NOT_OBJECTIVE_OWNER: 'NOT_OBJECTIVE_OWNER',
    NOT_AUTHORIZED_OBJECTIVE: 'NOT_AUTHORIZED_OBJECTIVE',
    NOT_AUTHORIZED_NOTIFICATION: 'NOT_AUTHORIZED_NOTIFICATION',

    PLATFORM_ALREADY_CONFIGURED: 'PLATFORM_ALREADY_CONFIGURED',
    SETUP_USER_COUNT: 'SETUP_USER_COUNT',
    SETUP_USER_MISMATCH: 'SETUP_USER_MISMATCH',
    SETUP_AUTH_REQUIRED: 'SETUP_AUTH_REQUIRED',

    INTERNAL_ERROR: 'INTERNAL_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
