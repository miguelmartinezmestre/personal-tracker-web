export const authEnv = {
    JWKS: process.env['JWKS']?.trim() ? process.env['JWKS']?.trim() : undefined,
} as const;
