import '@repo/ui/globals.css';

import { TextSelectionToolbar } from '@/features/text-selection-toolbar-llm/text-selection-toolbar';
import { ConvexClientProvider } from '@/features/convex/convex-provider';
import { ThemeProvider } from '@/features/theme/theme';
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
                                <TextSelectionToolbar />
                            </NextIntlClientProvider>
                        </Suspense>
                    </main>
                    <Toaster />
                </ThemeProvider>
            </body>
        </html>
    );
}
