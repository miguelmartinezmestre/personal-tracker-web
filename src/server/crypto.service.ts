import { createHash, randomBytes, randomUUID } from 'crypto';

export async function hashPassword(password: string) {
    return createHash('sha512').update(password).digest('hex');
}

export async function verifyPassword(password: string, passwordAlreadyHashed: string) {

    const inputPasswordHashed = await hashPassword(password);

    return (
        inputPasswordHashed === passwordAlreadyHashed
    );
}

export async function generateResetPasswordKey() {
    return randomUUID();
}

export async function generateSessionId() {
    const bytes = randomBytes(32);
    const sessionId = bytes.toString('hex');
    return sessionId;
}