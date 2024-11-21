import { createFileRoute } from '@tanstack/react-router'
import Section from '../components/section'
import Header from '../components/header'
import Footer from '../components/footer'

export const Route = createFileRoute('/')({
    component: RouteComponent,
})

function RouteComponent() {

    return (
        <div className="flex flex-col min-h-screen">

            <Header />

            <main className="flex-grow container mx-auto px-4 py-8">
                <Section
                    title="Bienvenidos a Mi Sitio"
                    content="Esta es la sección principal de nuestra página web. Aquí puedes encontrar información importante sobre nuestros servicios y ofertas."
                />
                <Section
                    title="Nuestros Servicios"
                    content="Ofrecemos una amplia gama de servicios para satisfacer tus necesidades. Desde consultoría hasta desarrollo de software, estamos aquí para ayudarte."
                />
                <Section
                    title="Sobre Nosotros"
                    content="Somos un equipo apasionado dedicado a proporcionar soluciones innovadoras. Nuestra misión es ayudar a nuestros clientes a alcanzar sus objetivos tecnológicos."
                />

                <Section
                    title="Sobre Nosotros"
                    content="Somos un equipo apasionado dedicado a proporcionar soluciones innovadoras. Nuestra misión es ayudar a nuestros clientes a alcanzar sus objetivos tecnológicos."
                />

            </main>

            <Footer />

        </div>
    )
}
