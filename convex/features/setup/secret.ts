import { isSetupSecretLengthValid, MAX_SETUP_SECRET_LENGTH } from '../../shared/env';

export const SETUP_SECRET_HEADER = 'x-setup-secret';

export function isSetupSecretValid(
    expected: string | undefined,
    provided: string | null | undefined
): boolean {
    if (!expected) {
        return true;
    }

    const candidate = provided ?? '';
    let mismatch = expected.length ^ candidate.length;
    mismatch |= isSetupSecretLengthValid(expected) && expected.length > 0 ? 0 : 1;
    mismatch |= isSetupSecretLengthValid(candidate) && candidate.length > 0 ? 0 : 1;

    for (let index = 0; index < MAX_SETUP_SECRET_LENGTH; index += 1) {
        const expectedCode = index < expected.length ? expected.charCodeAt(index) : 0;
        const candidateCode = index < candidate.length ? candidate.charCodeAt(index) : 0;
        mismatch |= expectedCode ^ candidateCode;
    }

    return mismatch === 0;
}
