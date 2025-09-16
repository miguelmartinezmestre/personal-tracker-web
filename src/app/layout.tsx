import "@/app/globals.css"
import { ThemeProvider } from "@/providers/theme";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { Toaster } from "sonner";
import ConvexClientProvider from "@/providers/convex-provider";

export const metadata = {
  title: "Metricas",
  description: "Metricas",
}

export default async function Layout({ children }: { children: React.ReactNode }) {

  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <main>
            <NextIntlClientProvider>
              <ConvexClientProvider>{children}</ConvexClientProvider>
            </NextIntlClientProvider>
          </main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

