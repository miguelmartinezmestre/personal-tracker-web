export const DEFAULT_MAILHOG_SMTP_ENV = {
    EMAIL_PROVIDER: 'smtp',
    EMAIL_FROM: 'Metricas <noreply@metricas.local>',
    SMTP_HOST: 'mailhog',
    SMTP_PORT: '1025',
    SMTP_SECURE: 'false',
    SMTP_USER: 'mailhog',
    SMTP_PASSWORD: 'mailhog',
} as const;

export function buildMailhogConvexEnv(env: Record<string, string | undefined>) {
    return {
        ...env,
        ...DEFAULT_MAILHOG_SMTP_ENV,
    };
}
