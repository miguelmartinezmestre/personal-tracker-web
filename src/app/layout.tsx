import '@/styles/globals.css';

import { BetterConvexProvider } from '@/features/convex/providers/convex-provider';
import { ThemeProvider } from '@/features/theme/theme';
import type { Metadata } from 'next';
import { NextIntlClientProvider, useLocale, useMessages } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { Toaster } from 'sonner';
import { getToken } from '@/features/auth/auth-server';
import { redirect } from 'next/navigation';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('App');

    return {
        title: t('title'),
        description: t('description'),
    };
}

export default async function Layout({ children }: { children: React.ReactNode }) {
    const locale = useLocale();
    const messages = useMessages();
    const token = await getToken();

    if (!token) {
        redirect('/login');
    }

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
                                <BetterConvexProvider token={token}>{children}</BetterConvexProvider>
                            </NextIntlClientProvider>
                        </Suspense>
                    </main>
                    <Toaster />
                </ThemeProvider>
            </body>
        </html>
    );
}
