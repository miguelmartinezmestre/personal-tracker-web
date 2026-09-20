type ProcessEnv = NodeJS.ProcessEnv;

const PROCESS_KEYS = new Set([
    'PATH',
    'PATHEXT',
    'SYSTEMROOT',
    'WINDIR',
    'COMSPEC',
    'TEMP',
    'TMP',
    'TMPDIR',
    'HOME',
    'USERPROFILE',
    'APPDATA',
    'LOCALAPPDATA',
    'PROGRAMFILES',
    'PROGRAMFILES(X86)',
    'SYSTEMDRIVE',
    'LANG',
    'LC_ALL',
    'TERM',
    'CI',
    'FORCE_COLOR',
    'NO_COLOR',
    'PNPM_HOME',
    'PLAYWRIGHT_BROWSERS_PATH',
    'PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD',
]);

const LOCAL_KEYS = new Set([
    'PORT',
    'SITE_PROXY_PORT',
    'DASHBOARD_PORT',
    'MAILHOG_SMTP_PORT',
    'MAILHOG_UI_PORT',
    'MYSQL_ROOT_PASSWORD',
    'DATABASE_URL',
    'MYSQL_URL',
    'CONVEX_CLOUD_ORIGIN',
    'CONVEX_SITE_ORIGIN',
    'NEXT_PUBLIC_DEPLOYMENT_URL',
    'CONVEX_SELF_HOSTED_URL',
    'CONVEX_SELF_HOSTED_ADMIN_KEY',
    'NEXT_PUBLIC_CONVEX_URL',
    'NEXT_PUBLIC_CONVEX_SITE_URL',
    'NEXT_PUBLIC_SITE_URL',
    'SITE_URL',
    'BETTER_AUTH_URL',
    'BETTER_AUTH_SECRET',
    'JWKS',
    'SETUP_SECRET',
    'E2E_SETUP_SECRET',
    'E2E_MAILHOG_UI_PORT',
    'NEXT_PUBLIC_E2E_ALLOW_LOCAL_HTTP',
    'NEXT_DIST_DIR',
    'BASE_URL',
    'PLAYWRIGHT_HTML_OPEN',
    'NODE_ENV',
    'EMAIL_PROVIDER',
    'EMAIL_FROM',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_SECURE',
    'SMTP_USER',
    'SMTP_PASSWORD',
    'DISABLE_BEACON',
    'REDACT_LOGS_TO_CLIENT',
    'DO_NOT_REQUIRE_SSL',
]);

const FORBIDDEN_KEYS =
    /^(?:CONVEX_DEPLOYMENT|CONVEX_DEPLOY_KEY|POSTGRES_URL|AWS_.+|S3_.+|RESEND_API_KEY)$/;
const URL_KEYS =
    /^(?:CONVEX_CLOUD_ORIGIN|CONVEX_SITE_ORIGIN|NEXT_PUBLIC_DEPLOYMENT_URL|CONVEX_SELF_HOSTED_URL|NEXT_PUBLIC_CONVEX_URL|NEXT_PUBLIC_CONVEX_SITE_URL|NEXT_PUBLIC_SITE_URL|SITE_URL|BETTER_AUTH_URL|BASE_URL)$/;

export function processEnvironment(source: ProcessEnv = process.env): ProcessEnv {
    return Object.fromEntries(
        Object.entries(source).filter(
            ([key, value]) => PROCESS_KEYS.has(key.toUpperCase()) && typeof value === 'string'
        )
    );
}

export function assertLoopbackUrl(value: string, label: string): void {
    const url = new URL(value);
    if (
        !['http:', 'https:'].includes(url.protocol) ||
        !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
        url.username ||
        url.password
    ) {
        throw new Error(`${label} must use a loopback HTTP origin`);
    }
}

function validateLocalValue(key: string, value: string): void {
    if (URL_KEYS.test(key)) assertLoopbackUrl(value, key);
    if (key === 'DATABASE_URL' || key === 'MYSQL_URL') {
        const url = new URL(value);
        if (url.protocol !== 'mysql:' || url.hostname !== 'mysql') {
            throw new Error(`${key} must use the internal MySQL service`);
        }
    }
    if (key === 'SMTP_HOST' && value !== 'mailhog') {
        throw new Error('Local stacks must use MailHog');
    }
}

export function buildStackEnvironment(options: {
    mode: 'local' | 'e2e';
    source?: ProcessEnv;
    overrides?: ProcessEnv;
}): ProcessEnv {
    const source = options.source ?? process.env;
    if (options.mode === 'e2e') {
        for (const [key, value] of Object.entries(source)) {
            if (value && FORBIDDEN_KEYS.test(key)) {
                throw new Error(`E2E refuses external configuration: ${key}`);
            }
            if (value && (URL_KEYS.test(key) || key === 'DATABASE_URL' || key === 'MYSQL_URL')) {
                validateLocalValue(key, value);
            }
        }
    }
    const result = processEnvironment(source);
    for (const [key, value] of Object.entries(options.overrides ?? {})) {
        if (value === undefined) continue;
        if (FORBIDDEN_KEYS.test(key) && value === '') continue;
        if (!LOCAL_KEYS.has(key) && !PROCESS_KEYS.has(key.toUpperCase())) {
            throw new Error(`Unsupported local stack setting: ${key}`);
        }
        validateLocalValue(key, value);
        result[key] = value;
    }
    // Prevent dotenv from recovering cloud destinations from an existing local file.
    result.CONVEX_DEPLOYMENT = '';
    result.CONVEX_DEPLOY_KEY = '';
    result.DATABASE_URL ??= 'mysql://root:root@mysql:3306/convex_self_hosted';
    result.MYSQL_URL ??= 'mysql://root:root@mysql:3306';
    result.DISABLE_BEACON = '1';
    result.REDACT_LOGS_TO_CLIENT = '1';
    result.DO_NOT_REQUIRE_SSL = '1';
    return result;
}
