import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
            <h1 className="text-4xl font-bold mb-4">Página no encontrada en esta web</h1>
            <p className="text-xl mb-8 text-center">
                Ups! Parece que te has perdido en el ciberespacio.
            </p>
            <div className="flex flex-col gap-4 items-center">
                <p className="text-lg mb-2">¿Qué te gustaría hacer?</p>
                <Link href="/" prefetch={true}>
                    <button className="w-full md:w-auto">
                        <Home className="mr-2 h-4 w-4" /> Ir al inicio
                    </button>
                </Link>
                {/* <Link href="/search">
                    <button className="w-full md:w-auto">
                        <Search className="mr-2 h-4 w-4" /> Buscar contenido
                    </button>
                </Link>
                <Link href="/trends">
                    <button className="w-full md:w-auto">
                        <TrendingUp className="mr-2 h-4 w-4" /> Ver tendencias
                    </button>
                </Link> */}
            </div>
            {/* <p className="mt-8 text-muted-foreground">
                Si crees que esto es un error, por favor <Link href="/contact" className="text-primary hover:underline">contáctanos</Link>.
            </p> */}
        </div>
    );
}
