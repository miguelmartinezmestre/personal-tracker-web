import "@/app/globals.css"
import { ThemeProvider } from "@/providers/theme";
import { TRPCReactProvider } from "@/trpc/client";

export default function Layout({ children }: { children: React.ReactNode }) {

  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <main>
            <TRPCReactProvider>{children}</TRPCReactProvider>
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}

