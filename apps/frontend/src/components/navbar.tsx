export default function Navbar() {
    const links: { name: string, href: string }[] = [
        { name: 'Inicio', href: '/' },
        { name: 'Acerca', href: '/about' },
        { name: 'Iniciar sesión', href: '/login' },
        { name: 'Registrase', href: '/register' }
    ];

    return (
        <nav className="bg-blue-600 text-white shadow">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                <div className="font-bold text-xl">MiSitio</div>
                <ul className="flex space-x-4">
                    {links.map((link) => (
                        <li key={link.name}>
                            <a href={link.href} className="hover:underline">
                                {link.name}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        </nav>
    );
};