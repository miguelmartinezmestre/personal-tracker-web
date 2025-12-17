import '@repo/ui/globals.css';

import ConvexClientProvider from '@/providers/convex-provider';
import { ThemeProvider } from '@/providers/theme';
import type { Metadata } from 'next';
import { NextIntlClientProvider, useLocale, useMessages } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { Toaster } from 'sonner';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('App');

    return {
        title: t('title'),
        description: t('description'),
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    const locale = useLocale();
    const messages = useMessages();

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
                                <ConvexClientProvider>{children}</ConvexClientProvider>
                            </NextIntlClientProvider>
                        </Suspense>
                    </main>
                    <Toaster />
                </ThemeProvider>
            </body>
        </html>
    );
}
