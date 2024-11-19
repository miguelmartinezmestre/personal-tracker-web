import { createLazyFileRoute, Link } from '@tanstack/react-router'
import Footer from '../components/footer'
import Navbar from '../components/navbar'
import Section from '../components/section'

export const Route = createLazyFileRoute('/')({
    component: RouteComponent,
})


function RouteComponent() {
    return (
        <div className="flex flex-col min-h-screen bg-gray-100">
            <Navbar />
            <main className="flex-1">
                <Section id="inicio" title="Sección de Inicio">
                    <p>Bienvenido a mi página. Aquí encontrarás información relevante sobre nuestros servicios.</p>
                </Section>
            </main>
            <Footer />
        </div>
    )
}