import "@/app/globals.css"
import { ThemeProvider } from "@/providers/theme";
import { NextIntlClientProvider } from "next-intl";
import { Suspense } from "react";
import { Toaster } from "sonner";
import ConvexClientProvider from "@/providers/convex-provider";

export const metadata = {
  title: "Metricas",
  description: "Metricas",
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <main>
            <Suspense fallback={null}>
              <NextIntlClientProvider>
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

