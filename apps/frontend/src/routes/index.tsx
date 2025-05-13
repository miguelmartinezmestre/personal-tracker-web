import { createFileRoute } from '@tanstack/react-router';
import Section from '../components/section';
import Header from '../components/header';
import Footer from '../components/footer';

export const Route = createFileRoute('/')({
    component: RouteComponent,
});

function RouteComponent() {
    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8">
                <Section
                    title="Bienvenido a Metricas Personales"
                    content="Una pagina para medir tus metricas personales"
                />
            </main>

            <Footer />
        </div>
    );
}
