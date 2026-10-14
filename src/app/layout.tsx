import { headers } from 'next/headers';
import '@/styles/globals.css';

import { BetterConvexProvider } from '@/platform/convex/providers/convex-provider';
import { ThemeProvider } from 'next-themes';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { Toaster } from 'sonner';
import { getToken } from '@/features/auth/server';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('App');

    return {
        title: { template: `%s | ${t('title')}`, default: t('title') },
        description: t('description'),
    };
}

export default async function Layout({ children }: { children: React.ReactNode }) {
    const nonce = (await headers()).get('x-nonce') ?? undefined;
    const [locale, messages, token] = await Promise.all([getLocale(), getMessages(), getToken()]);

    return (
        <html lang={locale} suppressHydrationWarning>
            <body>
                <ThemeProvider
                    nonce={nonce}
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <div className="contents">
                        <NextIntlClientProvider locale={locale} messages={messages}>
                            <BetterConvexProvider token={token ?? ''}>
                                {children}
                            </BetterConvexProvider>
                        </NextIntlClientProvider>
                    </div>
                    <Toaster position="bottom-right" richColors closeButton />
                </ThemeProvider>
            </body>
        </html>
    );
}
