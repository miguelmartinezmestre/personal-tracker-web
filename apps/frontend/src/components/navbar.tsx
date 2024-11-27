import { Link } from "@tanstack/react-router";

type LinkItem = { name: string, href: string };

type LinkArray = LinkItem[];

const links: LinkArray = [
    { name: 'Registrase', href: '/register' },
    { name: 'Iniciar sesión', href: '/login' },
    { name: 'Mas Información', href: '/about' },
];

export default function NavBar() {

    return (
        <div className="flex flex-col lg:flex-row lg:space-x-4 space-y-2 lg:space-y-0">
            {links.map((link) => (
                <Link key={link.name} href={link.href} className="text-gray-600 hover:text-gray-800">
                    {link.name}
                </Link>
            ))}
        </div>
    )
}