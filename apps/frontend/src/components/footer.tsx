import { Link } from "@tanstack/react-router";

export default function Footer() {
    return (
        <footer className="bg-gray-800 text-white">
            <div className="container mx-auto px-4 py-6">
                <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                    <p>&copy; 2024 Mi Sitio. Todos los derechos reservados.</p>
                    <div className="flex space-x-4">
                        <Link href="/privacidad" className="hover:underline">
                            Política de Privacidad
                        </Link>
                        <Link href="/terminos" className="hover:underline">
                            Términos de Servicio
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};