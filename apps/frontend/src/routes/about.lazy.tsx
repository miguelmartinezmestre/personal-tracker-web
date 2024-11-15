import { createLazyFileRoute } from '@tanstack/react-router'
import Navbar from '../components/navbar'
import Footer from '../components/footer'
import Section from '../components/section'

export const Route = createLazyFileRoute('/about')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Navbar />
      <main className="flex-1">
        <Section id="inicio" title="Sección de Inicio">
          <p>Metricas tiene como objetivos:</p>
          <ul>
            <li>1º Que los usuarios puedan añadir sus objetivos personales</li>
            <li>2º Que los usuarios puedan tener el control de sus objetivos personales</li>
            <li>3º Que los usuarios puedan ver el progreso de sus objetivos personales</li>
          </ul>
        </Section>
      </main>
      <Footer />
    </div>
  )
}
