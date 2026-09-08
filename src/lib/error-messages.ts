/**
 * Maps backend `ConvexError` codes (see `convex/utils/constants.ts` `ERROR_CODES`
 * and `shared/password-policy.ts`) to human-friendly, localized messages.
 *
 * The backend throws machine-readable codes such as `NOT_AUTHORIZED_OBJECTIVE`
 * on purpose; without this layer those raw codes were being shown verbatim to
 * users. This module is deliberately framework-free (a static bilingual table)
 * so it can be used from non-React contexts too (e.g. the global mutation-error
 * toast in the query client, which runs outside the React tree).
 */
import { isRecord } from '@shared/boundary-values';

export type ErrorLocale = 'en' | 'es';
type ErrorDictionary = {
    generic: string;
} & Record<string, string>;
const EN: ErrorDictionary = {
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'An account with this email already exists.',
    USER_ALREADY_EXISTS: 'An account with this email already exists.',
    INVALID_EMAIL_OR_PASSWORD: 'The email or password is incorrect.',
    INVALID_PASSWORD: 'The password is incorrect.',
    INVALID_TOKEN: 'This link is invalid or has expired.',
    TOKEN_EXPIRED: 'This link has expired. Request a new one.',
    SESSION_EXPIRED: 'You need to sign in to continue.',
    USER_BANNED: 'This account cannot sign in. Contact an administrator.',
    EMAIL_NOT_VERIFIED: 'Verify your email before continuing.',
    REGISTRATION_INVITATION_REQUIRED: 'You need a valid invitation to register.',
    SETUP_SECRET_REQUIRED: 'Enter the setup secret to continue.',
    generic: 'Something went wrong. Please try again.',
    AUTH_REQUIRED: 'You need to sign in to continue.',
    FORBIDDEN: "You don't have permission to do that.",
    WEAK_PASSWORD:
        'Password must include at least one uppercase letter, one lowercase letter, and one number.',
    PASSWORD_TOO_SHORT: 'Password must be at least 8 characters long.',
    NO_ACTIVE_ORG: 'Select an organization before continuing.',
    ORG_NOT_FOUND: 'That organization no longer exists.',
    PERSONAL_ORG_DELETE_FORBIDDEN: 'Your personal organization cannot be deleted.',
    PERSONAL_ORG_UPDATE_RESTRICTED: 'Your personal organization cannot be renamed.',
    PERSONAL_ORG_INVITE_FORBIDDEN: 'Your personal organization cannot invite members.',
    PERSONAL_ORG_MEMBER_ADD_FORBIDDEN: 'Your personal organization cannot add members.',
    OBJECTIVE_NOT_FOUND: 'That objective no longer exists.',
    PROGRESS_NOT_FOUND: 'That progress entry no longer exists.',
    CATEGORY_NOT_FOUND: 'That category no longer exists.',
    USER_NOT_FOUND: 'That user could not be found in this organization.',
    INVITATION_NOT_FOUND: 'That invitation no longer exists.',
    NOT_OBJECTIVE_OWNER: 'Only the objective owner can do that.',
    NOT_AUTHORIZED_OBJECTIVE: "You don't have permission to modify this objective.",
    NOT_AUTHORIZED_PROGRESS: "You don't have permission to modify this progress entry.",
    NOT_AUTHORIZED_COLLABORATOR: "You don't have permission to manage collaborators.",
    COLLABORATOR_NOT_FOUND: 'That collaborator no longer exists.',
    COLLABORATOR_ALREADY_EXISTS: 'That user is already a collaborator on this objective.',
    CANNOT_REMOVE_OWNER: 'The objective owner cannot be removed as a collaborator.',
    NOT_AUTHORIZED_NOTIFICATION: "You don't have permission to modify this notification.",
    OBJECTIVE_ID_LIMIT_EXCEEDED: 'Too many objectives were requested at once.',
    PLATFORM_ALREADY_CONFIGURED: 'The platform has already been set up.',
    SETUP_USER_COUNT: 'Setup can only be completed by the first registered user.',
    SETUP_USER_MISMATCH: 'This account cannot complete the platform setup.',
    SETUP_USER_DELETE_FORBIDDEN: 'The platform setup account cannot be deleted.',
    SETUP_USER_BAN_FORBIDDEN: 'The platform setup account cannot be banned.',
    SETUP_AUTH_REQUIRED: 'You need to sign in to complete the setup.',
    INTERNAL_ERROR: 'An unexpected error occurred. Please try again.',
    VALIDATION_ERROR: 'Some of the information provided is not valid.',
    FUTURE_DATE_NOT_ALLOWED: 'The date cannot be in the future.',
    DATE_TOO_OLD: 'The date is too far in the past.',
    OBJECTIVE_ALREADY_COMPLETED: 'This objective is already completed.',
    TARGET_NOT_FINITE: 'The target value is not a valid number.',
    TARGET_TOO_SMALL: 'The target value is too small.',
    TARGET_TOO_LARGE: 'The target value is too large.',
    VALUE_NOT_FINITE: 'The value is not a valid number.',
    VALUE_NEGATIVE: 'The value cannot be negative.',
    VALUE_TOO_LARGE: 'The value is too large.',
    DEADLINE_TOO_OLD: 'The deadline is too far in the past.',
    DEADLINE_TOO_FAR: 'The deadline is too far in the future.',
    START_AFTER_TARGET: 'The starting value cannot be greater than the target value.',
    CATEGORY_HAS_OBJECTIVES: 'This category still has objectives and cannot be deleted.',
    DUPLICATE_CATEGORY_NAME: 'A category with that name already exists.',
    DEFAULT_CATEGORIES_ALREADY_EXIST: 'The default categories already exist.',
};
const ES: ErrorDictionary = {
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Ya existe una cuenta con este correo.',
    USER_ALREADY_EXISTS: 'Ya existe una cuenta con este correo.',
    INVALID_EMAIL_OR_PASSWORD: 'El correo o la contraseña no son correctos.',
    INVALID_PASSWORD: 'La contraseña no es correcta.',
    INVALID_TOKEN: 'El enlace no es válido o ha caducado.',
    TOKEN_EXPIRED: 'El enlace ha caducado. Solicita uno nuevo.',
    SESSION_EXPIRED: 'Debes iniciar sesión para continuar.',
    USER_BANNED: 'Esta cuenta no puede iniciar sesión. Contacta con un administrador.',
    EMAIL_NOT_VERIFIED: 'Verifica tu correo antes de continuar.',
    REGISTRATION_INVITATION_REQUIRED: 'Necesitas una invitación válida para registrarte.',
    SETUP_SECRET_REQUIRED: 'Introduce la clave de configuración para continuar.',
    generic: 'Algo ha salido mal. Inténtalo de nuevo.',
    AUTH_REQUIRED: 'Debes iniciar sesión para continuar.',
    FORBIDDEN: 'No tienes permiso para hacer eso.',
    WEAK_PASSWORD: 'La contraseña debe incluir al menos una mayúscula, una minúscula y un número.',
    PASSWORD_TOO_SHORT: 'La contraseña debe tener al menos 8 caracteres.',
    NO_ACTIVE_ORG: 'Selecciona una organización antes de continuar.',
    ORG_NOT_FOUND: 'Esa organización ya no existe.',
    PERSONAL_ORG_DELETE_FORBIDDEN: 'Tu organización personal no se puede eliminar.',
    PERSONAL_ORG_UPDATE_RESTRICTED: 'Tu organización personal no se puede renombrar.',
    PERSONAL_ORG_INVITE_FORBIDDEN: 'Tu organización personal no puede invitar a miembros.',
    PERSONAL_ORG_MEMBER_ADD_FORBIDDEN: 'Tu organización personal no puede añadir miembros.',
    OBJECTIVE_NOT_FOUND: 'Ese objetivo ya no existe.',
    PROGRESS_NOT_FOUND: 'Ese registro de progreso ya no existe.',
    CATEGORY_NOT_FOUND: 'Esa categoría ya no existe.',
    USER_NOT_FOUND: 'No se ha encontrado ese usuario en esta organización.',
    INVITATION_NOT_FOUND: 'Esa invitación ya no existe.',
    NOT_OBJECTIVE_OWNER: 'Solo el propietario del objetivo puede hacer eso.',
    NOT_AUTHORIZED_OBJECTIVE: 'No tienes permiso para modificar este objetivo.',
    NOT_AUTHORIZED_PROGRESS: 'No tienes permiso para modificar este registro de progreso.',
    NOT_AUTHORIZED_COLLABORATOR: 'No tienes permiso para gestionar colaboradores.',
    COLLABORATOR_NOT_FOUND: 'Ese colaborador ya no existe.',
    COLLABORATOR_ALREADY_EXISTS: 'Ese usuario ya es colaborador de este objetivo.',
    CANNOT_REMOVE_OWNER: 'No se puede quitar al propietario como colaborador.',
    NOT_AUTHORIZED_NOTIFICATION: 'No tienes permiso para modificar esta notificación.',
    OBJECTIVE_ID_LIMIT_EXCEEDED: 'Se han solicitado demasiados objetivos a la vez.',
    PLATFORM_ALREADY_CONFIGURED: 'La plataforma ya ha sido configurada.',
    SETUP_USER_COUNT: 'La configuración solo puede completarla el primer usuario registrado.',
    SETUP_USER_MISMATCH: 'Esta cuenta no puede completar la configuración de la plataforma.',
    SETUP_USER_DELETE_FORBIDDEN:
        'La cuenta de configuración de la plataforma no se puede eliminar.',
    SETUP_USER_BAN_FORBIDDEN: 'La cuenta de configuración de la plataforma no se puede bloquear.',
    SETUP_AUTH_REQUIRED: 'Debes iniciar sesión para completar la configuración.',
    INTERNAL_ERROR: 'Se ha producido un error inesperado. Inténtalo de nuevo.',
    VALIDATION_ERROR: 'Parte de la información proporcionada no es válida.',
    FUTURE_DATE_NOT_ALLOWED: 'La fecha no puede estar en el futuro.',
    DATE_TOO_OLD: 'La fecha es demasiado antigua.',
    OBJECTIVE_ALREADY_COMPLETED: 'Este objetivo ya está completado.',
    TARGET_NOT_FINITE: 'El valor objetivo no es un número válido.',
    TARGET_TOO_SMALL: 'El valor objetivo es demasiado pequeño.',
    TARGET_TOO_LARGE: 'El valor objetivo es demasiado grande.',
    VALUE_NOT_FINITE: 'El valor no es un número válido.',
    VALUE_NEGATIVE: 'El valor no puede ser negativo.',
    VALUE_TOO_LARGE: 'El valor es demasiado grande.',
    DEADLINE_TOO_OLD: 'La fecha límite es demasiado antigua.',
    DEADLINE_TOO_FAR: 'La fecha límite está demasiado lejos en el futuro.',
    START_AFTER_TARGET: 'El valor inicial no puede ser mayor que el valor objetivo.',
    CATEGORY_HAS_OBJECTIVES: 'Esta categoría todavía tiene objetivos y no se puede eliminar.',
    DUPLICATE_CATEGORY_NAME: 'Ya existe una categoría con ese nombre.',
    DEFAULT_CATEGORIES_ALREADY_EXIST: 'Las categorías por defecto ya existen.',
};
const DICTIONARIES: Record<ErrorLocale, ErrorDictionary> = { en: EN, es: ES };
function codeFromMessage(message: string): string | undefined {
    const trimmed = message.trim();
    if (/^[A-Z][A-Z0-9_]+$/.test(trimmed)) {
        return trimmed;
    }
    return trimmed.match(/ConvexError:\s*([A-Z][A-Z0-9_]+)/)?.[1];
}

export function extractErrorCode(error: unknown): string | undefined {
    const seen = new Set<object>();
    function visit(value: unknown, depth: number): string | undefined {
        if (typeof value === 'string') {
            return codeFromMessage(value);
        }
        if (!isRecord(value) || depth > 8 || seen.has(value)) {
            return undefined;
        }
        seen.add(value);
        return (
            visit(value.data, depth + 1) ??
            visit(value.code, depth + 1) ??
            visit(value.message, depth + 1) ??
            visit(value.cause, depth + 1)
        );
    }
    return visit(error, 0);
}

export function resolveErrorMessage(
    error: unknown,
    locale: ErrorLocale = 'en',
    fallback?: string
): string {
    const dictionary = DICTIONARIES[locale];
    const code = extractErrorCode(error);
    return (code ? dictionary[code] : undefined) ?? fallback ?? dictionary.generic;
}

export function getErrorLocale(): ErrorLocale {
    if (!('document' in globalThis)) {
        return 'en';
    }
    const match = document.cookie.match(/(?:^|;\s*)locale=(en|es)/);
    if (!match) {
        return 'en';
    }
    const locale = match[1];
    if (locale === 'en' || locale === 'es') {
        return locale;
    }
    return 'en';
}
