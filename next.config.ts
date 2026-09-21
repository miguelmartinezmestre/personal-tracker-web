import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const e2eDistDir = process.env.NEXT_DIST_DIR;

const nextConfig: NextConfig = {
    reactCompiler: true,
    allowedDevOrigins: ['127.0.0.1', 'localhost'],
    experimental: {
        turbopackFileSystemCacheForDev: e2eDistDir ? false : true,
    },
    typedRoutes: true,
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production' && !e2eDistDir,
        reactRemoveProperties: process.env.NODE_ENV === 'production' && !e2eDistDir,
    },
    ...(e2eDistDir ? { distDir: e2eDistDir } : {}),
};

export default withNextIntl(nextConfig);
