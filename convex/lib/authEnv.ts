function optionalValue(name: string): string | undefined {
    const value = process.env[name]?.trim();
    return value ? value : undefined;
}

/** Env read by auth.config.ts only — keep free of optional E2E-only variables. */
export const authEnv = {
    JWKS: optionalValue('JWKS'),
} as const;
