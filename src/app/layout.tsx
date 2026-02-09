import '@/styles/globals.css';

import { BetterConvexProvider } from '@/features/convex/providers/convex-provider';
import { ThemeProvider } from '@/features/theme/theme';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { Toaster } from 'sonner';
import { getToken } from '@/features/auth/auth-server';
import { NotificationSonnerListener } from '@/features/notifications/components/notification-sonner-listener';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('App');

    return {
        title: t('title'),
        description: t('description'),
    };
}

export default async function Layout({ children }: { children: React.ReactNode }) {
    const [locale, messages, token] = await Promise.all([
        getLocale(),
        getMessages(),
        getToken(),
    ]);

    return (
        <html lang={locale} suppressHydrationWarning>
            <body>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <main>
                        <Suspense fallback={null}>
                            <NextIntlClientProvider locale={locale} messages={messages}>
                                <BetterConvexProvider token={token ?? ''}>
                                    <NotificationSonnerListener />
                                    {children}
                                </BetterConvexProvider>
                            </NextIntlClientProvider>
                        </Suspense>
                    </main>
                    <Toaster />
                </ThemeProvider>
            </body>
        </html>
    );
}
