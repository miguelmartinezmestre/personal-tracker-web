export type EmailProvider = 'resend' | 'smtp';

export type EnvSource = Record<string, string | undefined>;

export type ResendEmailConfig = {
    provider: 'resend';
    from: string;
    apiKey: string;
};

export type SmtpEmailConfig = {
    provider: 'smtp';
    from: string;
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
};

const DEFAULT_EMAIL_PROVIDER: EmailProvider = 'resend';
const MIN_PORT = 1;
const MAX_PORT = 65535;

function readEnv(env: EnvSource, name: string): string | undefined {
    const value = env[name]?.trim();
    return value === '' ? undefined : value;
}

function requireEnv(env: EnvSource, name: string): string {
    const value = readEnv(env, name);
    if (!value) {
        throw new Error(`${name} is required`);
    }
    return value;
}

function parseSmtpPort(rawPort: string): number {
    const port = Number.parseInt(rawPort, 10);
    if (!Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT) {
        throw new Error('SMTP_PORT must be a valid port number');
    }
    return port;
}

function parseSmtpSecure(env: EnvSource, port: number): boolean {
    const rawSecure = readEnv(env, 'SMTP_SECURE');
    if (rawSecure === undefined) {
        return port === 465;
    }

    const normalized = rawSecure.toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;

    throw new Error('SMTP_SECURE must be true or false');
}

export function getEmailProvider(env: EnvSource = process.env): EmailProvider {
    const provider = (readEnv(env, 'EMAIL_PROVIDER') ?? DEFAULT_EMAIL_PROVIDER).toLowerCase();

    if (provider === 'resend' || provider === 'smtp') {
        return provider;
    }

    throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
}

export function getResendEmailConfig(env: EnvSource = process.env): ResendEmailConfig {
    return {
        provider: 'resend',
        from: requireEnv(env, 'EMAIL_FROM'),
        apiKey: requireEnv(env, 'RESEND_API_KEY'),
    };
}

export function getSmtpEmailConfig(env: EnvSource = process.env): SmtpEmailConfig {
    const port = parseSmtpPort(requireEnv(env, 'SMTP_PORT'));

    return {
        provider: 'smtp',
        from: requireEnv(env, 'EMAIL_FROM'),
        host: requireEnv(env, 'SMTP_HOST'),
        port,
        secure: parseSmtpSecure(env, port),
        user: requireEnv(env, 'SMTP_USER'),
        password: requireEnv(env, 'SMTP_PASSWORD'),
    };
}
