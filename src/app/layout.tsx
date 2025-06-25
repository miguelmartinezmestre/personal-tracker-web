import "@/app/globals.css"
import { ThemeProvider } from "@/providers/theme";
import { TRPCReactProvider } from "@/trpc/client";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { Toaster } from "sonner";

export const metadata = {
  title: "Metricas",
  description: "Metricas",
}

export default async function Layout({ children }: { children: React.ReactNode }) {

  const locale = await getLocale();

  console.log(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <main>
            <TRPCReactProvider>
              <NextIntlClientProvider>
                {children}
              </NextIntlClientProvider>
            </TRPCReactProvider>
          </main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

