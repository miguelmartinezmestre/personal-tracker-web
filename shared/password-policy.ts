export const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
export const PASSWORD_MIN_LENGTH = 8;

export type PasswordPolicyCode = 'PASSWORD_TOO_SHORT' | 'WEAK_PASSWORD';

export type PasswordPolicyResult =
    { ok: true } | { ok: false; code: PasswordPolicyCode; message: string };

export const STRONG_PASSWORD_MESSAGE_EN =
    'Password must include at least one uppercase letter, one lowercase letter, and one number';

export const STRONG_PASSWORD_MESSAGE_ES =
    'La contraseña debe incluir al menos una mayúscula, una minúscula y un número';

export const PASSWORD_TOO_SHORT_MESSAGE_EN = 'Password must be at least 8 characters long';

export const PASSWORD_TOO_SHORT_MESSAGE_ES = 'La contraseña debe tener al menos 8 caracteres';

export function validatePasswordPolicy(password: unknown): PasswordPolicyResult {
    if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
        return {
            ok: false,
            code: 'PASSWORD_TOO_SHORT',
            message: PASSWORD_TOO_SHORT_MESSAGE_EN,
        };
    }

    if (!STRONG_PASSWORD_REGEX.test(password)) {
        return {
            ok: false,
            code: 'WEAK_PASSWORD',
            message: STRONG_PASSWORD_MESSAGE_EN,
        };
    }

    return { ok: true };
}
