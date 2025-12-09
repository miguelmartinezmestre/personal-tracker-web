"use client"

export default function Footer() {
    return (
        <footer className="text-primary border-t border-gray-200">
            <div className="container mx-auto px-4 py-6 ">
                <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                    <p>&copy; {new Date().getFullYear()} Metricas</p>
                    <div className="flex space-x-4">
                        {/* <Link href="/privacidad" className="hover:underline">
                            Política de Privacidad
                        </Link> */}
                    </div>
                </div>
            </div>
        </footer>
    );
}
