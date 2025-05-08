import { createFileRoute } from '@tanstack/react-router';
import Footer from '../components/footer';
import Header from '../components/header';

export const Route = createFileRoute('/about')({
    component: RouteComponent,
});

function RouteComponent() {
    return (
        <div className="flex flex-col min-h-screen">
            <Header />

            <main className="flex-grow container mx-auto px-4 py-8 text-primary">
                <p>Metricas tiene como objetivos:</p>
                <ul>
                    <li>1º Que los usuarios puedan añadir sus objetivos personales</li>
                    <li>2º Que los usuarios puedan tener el control de sus objetivos personales</li>
                    <li>3º Que los usuarios puedan ver el progreso de sus objetivos personales</li>
                </ul>
            </main>

            <Footer />
        </div>
    );
}
