import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Footer } from '@/features/landing';
import { Header } from '@/features/landing';
import { Compass, Home, LogIn } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export default async function NotFound() {
    const [tNotFound, tHomePage] = await Promise.all([
        getTranslations('NotFound'),
        getTranslations('HomePage'),
    ]);

    return (
        <div className="flex min-h-screen flex-col">
            <Header />

            <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-10">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
                <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-muted blur-3xl" />

                <Card className="relative w-full max-w-2xl border-primary/20 text-center shadow-lg">
                    <CardHeader className="space-y-4">
                        <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary">
                            <Compass aria-hidden className="size-8" />
                        </div>
                        <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">
                            404
                        </p>
                        <CardTitle className="text-3xl font-bold tracking-tight sm:text-4xl">
                            {tNotFound('title')}
                        </CardTitle>
                        <p className="mx-auto max-w-xl text-muted-foreground">
                            {tNotFound('subtitle')}
                        </p>
                    </CardHeader>

                    <CardContent>
                        <p className="text-sm text-muted-foreground">{tNotFound('whatToDo')}</p>
                    </CardContent>

                    <CardFooter className="flex flex-col justify-center gap-3 sm:flex-row">
                        <Button
                            render={
                                <Link href="/" prefetch={false} data-testid="not-found-home-link" />
                            }
                        >
                            <Home aria-hidden />
                            {tNotFound('goHome')}
                        </Button>
                        <Button
                            render={
                                <Link
                                    href="/login"
                                    prefetch={false}
                                    data-testid="not-found-login-link"
                                />
                            }
                            variant="outline"
                            className="w-full sm:w-auto"
                        >
                            <LogIn aria-hidden />
                            {tHomePage('login')}
                        </Button>
                    </CardFooter>
                </Card>
            </main>

            <Footer />
        </div>
    );
}
