export type ErrorLocale = 'en' | 'es';
type ErrorDictionary = {
    generic: string;
} & Record<string, string>;
const EN: ErrorDictionary = {
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'An account with this email already exists.',
    INVALID_EMAIL_OR_PASSWORD: 'The email or password is incorrect.',
    INVALID_PASSWORD: 'The password is incorrect.',
    INVALID_TOKEN: 'This link is invalid or has expired.',
    TOKEN_EXPIRED: 'This link has expired. Request a new one.',
    SESSION_EXPIRED: 'You need to sign in to continue.',
    BANNED_USER: 'This account cannot sign in. Contact an administrator.',
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
    USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION:
        'That user is already a member of this organization.',
    USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION: 'That user already has a pending invitation.',
    YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION:
        'This invitation was sent to another email address.',
    ORGANIZATION_SLUG_ALREADY_TAKEN: 'An organization with that identifier already exists.',
    ORGANIZATION_NAME_TAKEN: 'You already have an organization with that name.',
    ORGANIZATION_ALREADY_EXISTS: 'An organization with that identifier already exists.',
    YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER:
        'You are the only owner. Make someone else an owner before leaving.',
    YOU_CANNOT_LEAVE_THE_ORGANIZATION_WITHOUT_AN_OWNER:
        'The organization needs an owner. Make someone else an owner before leaving.',
    NOT_AUTHORIZED_OBJECTIVE: "You don't have permission to modify this objective.",
    NOT_AUTHORIZED_PROGRESS: "You don't have permission to modify this progress entry.",
    PLATFORM_ALREADY_CONFIGURED: 'The platform has already been set up.',
    SETUP_USER_MISMATCH: 'This account cannot complete the platform setup.',
    SETUP_USER_DELETE_FORBIDDEN: 'The platform setup account cannot be deleted.',
    SETUP_AUTH_REQUIRED: 'You need to sign in to complete the setup.',
    INTERNAL_ERROR: 'An unexpected error occurred. Please try again.',
    VALIDATION_ERROR: 'Some of the information provided is not valid.',
    FUTURE_DATE_NOT_ALLOWED: 'The date cannot be in the future.',
    OBJECTIVE_ALREADY_COMPLETED: 'This objective is already completed.',
    TARGET_NOT_FINITE: 'The target value is not a valid number.',
    TARGET_TOO_SMALL: 'The target value is too small.',
    VALUE_NOT_FINITE: 'The value is not a valid number.',
    VALUE_NEGATIVE: 'The value cannot be negative.',
    PROGRESS_NOT_POSITIVE: 'The progress must be greater than zero.',
    VALUE_TOO_LARGE: 'The value is too large.',
    DEADLINE_TOO_OLD: 'The deadline cannot be in the past.',
    START_AFTER_TARGET: 'The starting value must be lower than the target value.',
};
const ES: ErrorDictionary = {
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Ya existe una cuenta con este correo.',
    INVALID_EMAIL_OR_PASSWORD: 'El correo o la contraseña no son correctos.',
    INVALID_PASSWORD: 'La contraseña no es correcta.',
    INVALID_TOKEN: 'El enlace no es válido o ha caducado.',
    TOKEN_EXPIRED: 'El enlace ha caducado. Solicita uno nuevo.',
    SESSION_EXPIRED: 'Debes iniciar sesión para continuar.',
    BANNED_USER: 'Esta cuenta no puede iniciar sesión. Contacta con un administrador.',
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
    USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION:
        'Ese usuario ya es miembro de esta organización.',
    USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION: 'Ese usuario ya tiene una invitación pendiente.',
    YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION:
        'Esta invitación se envió a otra dirección de correo.',
    ORGANIZATION_SLUG_ALREADY_TAKEN: 'Ya existe una organización con ese identificador.',
    ORGANIZATION_NAME_TAKEN: 'Ya tienes una organización con ese nombre.',
    ORGANIZATION_ALREADY_EXISTS: 'Ya existe una organización con ese identificador.',
    YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER:
        'Eres el único propietario. Nombra a otra persona propietaria antes de salir.',
    YOU_CANNOT_LEAVE_THE_ORGANIZATION_WITHOUT_AN_OWNER:
        'La organización necesita un propietario. Nombra a otra persona propietaria antes de salir.',
    NOT_AUTHORIZED_OBJECTIVE: 'No tienes permiso para modificar este objetivo.',
    NOT_AUTHORIZED_PROGRESS: 'No tienes permiso para modificar este registro de progreso.',
    PLATFORM_ALREADY_CONFIGURED: 'La plataforma ya ha sido configurada.',
    SETUP_USER_MISMATCH: 'Esta cuenta no puede completar la configuración de la plataforma.',
    SETUP_USER_DELETE_FORBIDDEN:
        'La cuenta de configuración de la plataforma no se puede eliminar.',
    SETUP_AUTH_REQUIRED: 'Debes iniciar sesión para completar la configuración.',
    INTERNAL_ERROR: 'Se ha producido un error inesperado. Inténtalo de nuevo.',
    VALIDATION_ERROR: 'Parte de la información proporcionada no es válida.',
    FUTURE_DATE_NOT_ALLOWED: 'La fecha no puede estar en el futuro.',
    OBJECTIVE_ALREADY_COMPLETED: 'Este objetivo ya está completado.',
    TARGET_NOT_FINITE: 'El valor objetivo no es un número válido.',
    TARGET_TOO_SMALL: 'El valor objetivo es demasiado pequeño.',
    VALUE_NOT_FINITE: 'El valor no es un número válido.',
    VALUE_NEGATIVE: 'El valor no puede ser negativo.',
    PROGRESS_NOT_POSITIVE: 'El avance debe ser mayor que cero.',
    VALUE_TOO_LARGE: 'El valor es demasiado grande.',
    DEADLINE_TOO_OLD: 'La fecha límite no puede estar en el pasado.',
    START_AFTER_TARGET: 'El valor inicial debe ser menor que el valor objetivo.',
};
const DICTIONARIES: Record<ErrorLocale, ErrorDictionary> = { en: EN, es: ES };
type ErrorTraversalNode = {
    data?: unknown;
    code?: unknown;
    message?: unknown;
    cause?: unknown;
};
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
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            return undefined;
        }
        if (depth > 8 || seen.has(value)) {
            return undefined;
        }
        seen.add(value);
        const node = value as ErrorTraversalNode;
        return (
            visit(node.data, depth + 1) ??
            visit(node.code, depth + 1) ??
            visit(node.message, depth + 1) ??
            visit(node.cause, depth + 1)
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
    // The root layout sets <html lang> from the same cookie-then-platform-default rule as the UI.
    if (!('document' in globalThis)) {
        return 'en';
    }
    return document.documentElement.lang === 'es' ? 'es' : 'en';
}
