export const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
const PASSWORD_MIN_LENGTH = 8;
type PasswordPolicyCode = 'PASSWORD_TOO_SHORT' | 'WEAK_PASSWORD';
type PasswordPolicyResult =
    | {
          ok: true;
      }
    | {
          ok: false;
          code: PasswordPolicyCode;
          message: string;
      };
const STRONG_PASSWORD_MESSAGE_EN =
    'Password must include at least one uppercase letter, one lowercase letter, and one number';
export const STRONG_PASSWORD_MESSAGE_ES =
    'La contraseña debe incluir al menos una mayúscula, una minúscula y un número';
const PASSWORD_TOO_SHORT_MESSAGE_EN = 'Password must be at least 8 characters long';
export function validatePasswordPolicy(
    password: string | number | boolean | null | object | undefined
): PasswordPolicyResult {
    if (!(typeof password === 'string') || password.length < PASSWORD_MIN_LENGTH) {
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
