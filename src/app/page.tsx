import Header from '@/components/header';
import Footer from '@/components/footer';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Target, LineChart, CheckCircle, Users, Calendar, Lightbulb } from 'lucide-react';

export default async function RouteComponent() {

    return (
        <div className="flex flex-col min-h-screen">
            <Header />

            <main className="flex-grow container mx-auto px-4 py-8">
                <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
                    <div className="container px-4 md:px-6">
                        <div className="flex flex-col items-center space-y-4 text-center">
                            <div className="space-y-2">
                                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                                    Cumple tus objetivos. Controla tu progreso.
                                </h1>
                                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                                    Define, controlar y visualiza tu objetivos personales de forma sencilla. Mantente motivo para alcazar tus objetivos.
                                </p>
                            </div>
                            <div className="space-x-4">
                                <Link
                                    href="/register"
                                    className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                                >
                                    Empezar
                                </Link>
                                <Link
                                    href="/login"
                                    className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                                >
                                    Iniciar sesión
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
                                    Principales funcionalidades
                                </div>
                                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Logra tus objetivos con nuestro sistema</h2>
                                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                                    Nuestra plataforma está diseñada para ayudarte a establecer, controlar y alcanzar tus objetivos personales y profesionales con herramientas intuitivas y visualizaciones informativas.
                                </p>
                            </div>
                        </div>
                        <div className="mx-auto grid max-w-5xl items-start gap-6 py-12 lg:grid-cols-3 lg:gap-12">
                            <Card>
                                <CardHeader>
                                    <Target className="h-8 w-8 text-primary" />
                                    <CardTitle>Objetivos personalizables</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    Define cualquier objetivo, grande o pequeño, con métricas personalizadas, valores de objetivo y fechas límite. Ajusta a tus necesidades únicas.
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <LineChart className="h-8 w-8 text-primary" />
                                    <CardTitle>Panel de progreso visual</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    Ve tu progreso a la vista con gráficas y gráficos intuitivos. Entiende tu viaje y mantente motivado.
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CheckCircle className="h-8 w-8 text-primary" />
                                    <CardTitle>Actualizaciones periódicas</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    Registra actualizaciones a tus objetivos, rastrea hitos y ajusta tu estrategia según sea necesario para mantenerte en la senda.
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <Users className="h-8 w-8 text-primary" />
                                    <CardTitle>Rastreo colaborativo</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    Comparte tus objetivos con amigos, familiares o compañeros para obtener apoyo y responsabilidad.
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <Calendar className="h-8 w-8 text-primary" />
                                    <CardTitle>Recordatorios y notificaciones</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    Configura notificaciones automáticas para mantenerte enfocado.
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <Lightbulb className="h-8 w-8 text-primary" />
                                    <CardTitle>Análisis y reportes</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    Obtén profundas perspectivas sobre tus hábitos y rendimiento con análisis detallados y reportes.
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}