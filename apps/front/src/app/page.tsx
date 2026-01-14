import Header from '@/features/landing/components/header';
import Footer from '@/features/landing/components/footer';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui/components/card';
import { Target, LineChart, CheckCircle, Users, Calendar, Lightbulb } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function RouteComponent() {
    const t = await getTranslations('HomePage');

    return (
        <div className="flex flex-col min-h-screen">
            <Header />

            <main className="flex-grow container mx-auto px-4 py-8">
                <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
                    <div className="container px-4 md:px-6">
                        <div className="flex flex-col items-center space-y-4 text-center">
                            <div className="space-y-2">
                                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                                    {t('title')}
                                </h1>
                                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                                    {t('subtitle')}
                                </p>
                            </div>
                            <div className="space-x-4">
                                <Link
                                    href="/register"
                                    className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                                >
                                    {t('getStarted')}
                                </Link>
                                <Link
                                    href="/login"
                                    className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                                >
                                    {t('login')}
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
                <section className="w-full py-12 md:py-24 lg:py-32">
                    <div className="container px-4 md:px-6">
                        <div className="flex flex-col items-center justify-center space-y-4 text-center">
                            <div className="space-y-2">
                                <div className="inline-block rounded-lg bg-primary px-3 py-1 text-sm text-primary-foreground">
                                    {t('mainFeatures')}
                                </div>
                                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                                    {t('achieveGoals')}
                                </h2>
                                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                                    {t('ourPlatform')}
                                </p>
                            </div>
                        </div>
                        <div className="mx-auto grid max-w-5xl gap-6 py-12 md:grid-cols-2 lg:grid-cols-3 lg:gap-12">
                            <Card className="h-full">
                                <CardHeader>
                                    <Target className="h-8 w-8 text-primary" />
                                    <CardTitle>{t('customizableGoals')}</CardTitle>
                                </CardHeader>
                                <CardContent>{t('defineGoals')}</CardContent>
                            </Card>
                            <Card className="h-full">
                                <CardHeader>
                                    <LineChart className="h-8 w-8 text-primary" />
                                    <CardTitle>{t('visualProgressPanel')}</CardTitle>
                                </CardHeader>
                                <CardContent>{t('visualProgressPanelDescription')}</CardContent>
                            </Card>
                            <Card className="h-full">
                                <CardHeader>
                                    <CheckCircle className="h-8 w-8 text-primary" />
                                    <CardTitle>{t('periodicUpdates')}</CardTitle>
                                </CardHeader>
                                <CardContent>{t('periodicUpdatesDescription')}</CardContent>
                            </Card>
                            <Card className="h-full">
                                <CardHeader>
                                    <Users className="h-8 w-8 text-primary" />
                                    <CardTitle>{t('collaborativeTracking')}</CardTitle>
                                </CardHeader>
                                <CardContent>{t('collaborativeTrackingDescription')}</CardContent>
                            </Card>
                            <Card className="h-full">
                                <CardHeader>
                                    <Calendar className="h-8 w-8 text-primary" />
                                    <CardTitle>{t('notifications')}</CardTitle>
                                </CardHeader>
                                <CardContent>{t('notificationsDescription')}</CardContent>
                            </Card>
                            <Card className="h-full">
                                <CardHeader>
                                    <Lightbulb className="h-8 w-8 text-primary" />
                                    <CardTitle>{t('reports')}</CardTitle>
                                </CardHeader>
                                <CardContent>{t('reportsDescription')}</CardContent>
                            </Card>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
